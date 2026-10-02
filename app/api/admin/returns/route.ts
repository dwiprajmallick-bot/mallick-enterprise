import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireCurrentAdminUser,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

function generateReturnNumber() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const random = Math.floor(100000 + Math.random() * 900000);

  return `RET-${date}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentAdminUser();

    const { searchParams } = new URL(request.url);

    const orderId = searchParams.get("orderId");
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");

    const where: {
      orderId?: string;
      customerId?: string;
      status?: string;
    } = {};

    if (orderId) {
      where.orderId = orderId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.status = status;
    }

    const returns = await prisma.salesReturn.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    /*
     * SalesReturnItem has no Prisma relation to SalesReturn.
     * Therefore items are loaded separately and attached manually.
     *
     * This is important for:
     * - previous returned quantity calculation
     * - return history
     * - order return page
     * - return detail pages
     */
    const returnIds = returns.map((item) => item.id);

    const returnItems =
      returnIds.length > 0
        ? await prisma.salesReturnItem.findMany({
            where: {
              returnId: {
                in: returnIds,
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          })
        : [];

    const productIds = [
      ...new Set(returnItems.map((item) => item.productId)),
    ];

    const products =
      productIds.length > 0
        ? await prisma.product.findMany({
            where: {
              id: {
                in: productIds,
              },
            },
            select: {
              id: true,
              name: true,
              sku: true,
              category: true,
              image: true,
            },
          })
        : [];

    const productMap = new Map(
      products.map((product) => [product.id, product])
    );

    const itemsByReturnId = new Map<
      string,
      Array<
        (typeof returnItems)[number] & {
          product: (typeof products)[number] | null;
        }
      >
    >();

    for (const item of returnItems) {
      const existing = itemsByReturnId.get(item.returnId) ?? [];

      existing.push({
        ...item,
        product: productMap.get(item.productId) ?? null,
      });

      itemsByReturnId.set(item.returnId, existing);
    }

    const orderIds = [...new Set(returns.map((item) => item.orderId))];
    const customerIds = [
      ...new Set(returns.map((item) => item.customerId)),
    ];

    const orders =
      orderIds.length > 0
        ? await prisma.order.findMany({
            where: {
              id: {
                in: orderIds,
              },
            },
            select: {
              id: true,
              orderNumber: true,
              customerId: true,
              totalAmount: true,
              paymentStatus: true,
              orderStatus: true,
              createdAt: true,
            },
          })
        : [];

    const customers =
      customerIds.length > 0
        ? await prisma.customer.findMany({
            where: {
              id: {
                in: customerIds,
              },
            },
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              companyName: true,
              gstin: true,
            },
          })
        : [];

    const orderMap = new Map(
      orders.map((order) => [order.id, order])
    );

    const customerMap = new Map(
      customers.map((customer) => [customer.id, customer])
    );

    const result = returns.map((salesReturn) => ({
      ...salesReturn,
      items: itemsByReturnId.get(salesReturn.id) ?? [],
      order: orderMap.get(salesReturn.orderId) ?? null,
      customer:
        customerMap.get(salesReturn.customerId) ?? null,
    }));

    await writeAuditLog({
      db: prisma,
      actorUserId: user.id,
      actorRole: user.role,
      ...getRequestAuditMeta(request),
      action: "RETURN_VIEW",
      entityType: "SalesReturn",
      entityId: orderId ?? customerId ?? "LIST",
      description: `Viewed sales return list${orderId ? ` for order ${orderId}` : ""}.`,
      referenceType: orderId ? "Order" : undefined,
      referenceId: orderId ?? undefined,
    });

    return NextResponse.json({
      success: true,
      returns: result,
      count: result.length,
    });
  } catch (error) {
    console.error("GET /api/admin/returns error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load sales returns.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentAdminUser();

    const body = await request.json();

    const orderId = String(body.orderId ?? "").trim();
    const reason = String(body.reason ?? "").trim();
    const notes = body.notes
      ? String(body.notes).trim()
      : null;

    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "Order ID is required.",
        },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          error: "Return reason is required.",
        },
        { status: 400 }
      );
    }

    if (rawItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one product must be returned.",
        },
        { status: 400 }
      );
    }

    const mergedItems = new Map<
      string,
      number
    >();

    for (const rawItem of rawItems) {
      const productId = String(rawItem.productId ?? "").trim();
      const quantity = Number(rawItem.quantity ?? 0);

      if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
        continue;
      }

      mergedItems.set(
        productId,
        (mergedItems.get(productId) ?? 0) + quantity
      );
    }

    if (mergedItems.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid return quantities are required.",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new Error("Order not found.");
      }

      if (order.orderStatus === "CANCELLED") {
        throw new Error(
          "Cancelled orders cannot be returned."
        );
      }

      const previousReturns = await tx.salesReturn.findMany({
        where: {
          orderId,
          status: {
            not: "CANCELLED",
          },
        },
        select: {
          id: true,
        },
      });

      const previousReturnIds = previousReturns.map(
        (item) => item.id
      );

      const previousReturnItems =
        previousReturnIds.length > 0
          ? await tx.salesReturnItem.findMany({
              where: {
                returnId: {
                  in: previousReturnIds,
                },
              },
            })
          : [];

      const previousByProduct = new Map<string, number>();

      for (const item of previousReturnItems) {
        previousByProduct.set(
          item.productId,
          (previousByProduct.get(item.productId) ?? 0) +
            item.quantity
        );
      }

      const orderItemMap = new Map(
        order.items.map((item) => [item.productId, item])
      );

      const validatedItems: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        gstRate: number;
        gstAmount: number;
        totalAmount: number;
      }> = [];

      let subtotal = 0;
      let gstAmount = 0;
      let totalAmount = 0;

      for (const [productId, quantity] of mergedItems) {
        const orderItem = orderItemMap.get(productId);

        if (!orderItem) {
          throw new Error(
            `Product ${productId} was not found in this order.`
          );
        }

        const alreadyReturned =
          previousByProduct.get(productId) ?? 0;

        const availableQuantity =
          orderItem.quantity - alreadyReturned;

        if (quantity > availableQuantity) {
          throw new Error(
            `Return quantity exceeds available quantity for product ${productId}. Available: ${availableQuantity}.`
          );
        }

        const lineSubtotal =
          orderItem.unitPrice * quantity;

        const lineGst =
          lineSubtotal * (orderItem.gstRate / 100);

        const lineTotal =
          lineSubtotal + lineGst;

        subtotal += lineSubtotal;
        gstAmount += lineGst;
        totalAmount += lineTotal;

        validatedItems.push({
          productId,
          quantity,
          unitPrice: orderItem.unitPrice,
          gstRate: orderItem.gstRate,
          gstAmount: lineGst,
          totalAmount: lineTotal,
        });
      }

      const returnNumber = generateReturnNumber();

      const created = await tx.salesReturn.create({
        data: {
          returnNumber,
          orderId: order.id,
          customerId: order.customerId,
          status: "APPROVED",
          reason,
          subtotal,
          gstAmount,
          totalAmount,
          refundStatus: "PENDING",
          refundAmount: totalAmount,
          notes,
        },
      });

      for (const item of validatedItems) {
        await tx.salesReturnItem.create({
          data: {
            returnId: created.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            gstRate: item.gstRate,
            gstAmount: item.gstAmount,
            totalAmount: item.totalAmount,
          },
        });

        const product = await tx.product.findUnique({
          where: {
            id: item.productId,
          },
        });

        if (!product) {
          throw new Error(
            `Product ${item.productId} not found.`
          );
        }

        const previousStock = product.stock;
        const newStock =
          previousStock + item.quantity;

        await tx.product.update({
          where: {
            id: product.id,
          },
          data: {
            stock: newStock,
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "IN",
            quantity: item.quantity,
            previousStock,
            newStock,
            note: `Sales return ${returnNumber}`,
          },
        });

        await writeAuditLog({
          db: tx,
          actorUserId: user.id,
          actorRole: user.role,
          ...getRequestAuditMeta(request),
          action: "STOCK_IN",
          entityType: "Product",
          entityId: product.id,
          description: `Stock received back from sales return ${returnNumber}.`,
          oldValues: {
            stock: previousStock,
          },
          newValues: {
            stock: newStock,
          },
          reason: `Sales return ${returnNumber}`,
          referenceType: "SalesReturn",
          referenceId: created.id,
        });
      }

      await writeAuditLog({
        db: tx,
        actorUserId: user.id,
        actorRole: user.role,
        ...getRequestAuditMeta(request),
        action: "RETURN_CREATE",
        entityType: "SalesReturn",
        entityId: created.id,
        description: `Sales return ${returnNumber} created for order ${order.orderNumber}.`,
        newValues: {
          returnNumber,
          orderId: order.id,
          customerId: order.customerId,
          status: created.status,
          refundStatus: created.refundStatus,
          subtotal,
          gstAmount,
          totalAmount,
          items: validatedItems,
        },
        reason,
        referenceType: "Order",
        referenceId: order.id,
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      return: result,
    });
  } catch (error) {
    console.error("POST /api/admin/returns error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create sales return.";

    const status =
      message.includes("not found") ||
      message.includes("exceeds") ||
      message.includes("Cancelled")
        ? 400
        : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}