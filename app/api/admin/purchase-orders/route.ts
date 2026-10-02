import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireCurrentAdminUser,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

function makePoNumber() {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const random =
    Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase();

  return `PO-${date}-${random}`;
}

function toPaise(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return 0;
  }

  return Math.round(numberValue * 100);
}

export async function GET(request: Request) {
  try {
    const user = await requireCurrentAdminUser();

    const url = new URL(request.url);

    const search =
      url.searchParams.get("search")?.trim().toLowerCase() || "";

    const status =
      url.searchParams.get("status")?.trim() || "";

    const supplierId =
      url.searchParams.get("supplierId")?.trim() || "";

    const purchaseOrders =
      await prisma.purchaseOrder.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

    const suppliers =
      await prisma.supplier.findMany({
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          gstin: true,
        },
        orderBy: {
          name: "asc",
        },
      });

    const supplierMap = new Map(
      suppliers.map((supplier) => [
        supplier.id,
        supplier,
      ])
    );

    const filtered =
      purchaseOrders
        .filter((po) => {
          const supplier =
            supplierMap.get(po.supplierId);

          const haystack = [
            po.poNumber,
            po.status,
            po.notes || "",
            supplier?.name || "",
            supplier?.phone || "",
            supplier?.email || "",
            supplier?.gstin || "",
          ]
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !search ||
            haystack.includes(search);

          const matchesStatus =
            !status ||
            po.status === status;

          const matchesSupplier =
            !supplierId ||
            po.supplierId === supplierId;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesSupplier
          );
        })
        .map((po) => ({
          ...po,
          supplier:
            supplierMap.get(po.supplierId) || null,
        }));

    await writeAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      ...getRequestAuditMeta(request),
      action: "PURCHASE_ORDER_LIST_VIEW",
      entityType: "PurchaseOrder",
      entityId: null,
      description:
        "Viewed purchase order register.",
    });

    return NextResponse.json({
      success: true,
      purchaseOrders: filtered,
      suppliers,
      count: filtered.length,
    });
  } catch (error) {
    console.error(
      "Purchase order GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load purchase orders.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentAdminUser();

    const body = await request.json();

    const supplierId =
      typeof body.supplierId === "string"
        ? body.supplierId.trim()
        : "";

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : null;

    const rawItems =
      Array.isArray(body.items)
        ? body.items
        : [];

    if (!supplierId) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier is required.",
        },
        { status: 400 }
      );
    }

    if (rawItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one product is required.",
        },
        { status: 400 }
      );
    }

    const supplier =
      await prisma.supplier.findUnique({
        where: {
          id: supplierId,
        },
      });

    if (!supplier) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier not found.",
        },
        { status: 404 }
      );
    }

    const merged = new Map<
      string,
      {
        productId: string;
        description: string | null;
        quantity: number;
        unitCostPaise: number;
        gstRate: number;
      }
    >();

    for (const raw of rawItems) {
      const productId =
        typeof raw?.productId === "string"
          ? raw.productId.trim()
          : "";

      const quantity =
        Math.floor(Number(raw?.quantity));

      const unitCostPaise =
        toPaise(raw?.unitCost);

      const gstRate =
        Number(raw?.gstRate);

      if (!productId) {
        return NextResponse.json(
          {
            success: false,
            error: "Every PO item requires a product.",
          },
          { status: 400 }
        );
      }

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Every PO item quantity must be greater than zero.",
          },
          { status: 400 }
        );
      }

      if (
        !Number.isFinite(unitCostPaise) ||
        unitCostPaise < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid unit cost.",
          },
          { status: 400 }
        );
      }

      const safeGstRate =
        Number.isFinite(gstRate) &&
        gstRate >= 0
          ? gstRate
          : 0;

      const existing =
        merged.get(productId);

      if (existing) {
        existing.quantity += quantity;
      } else {
        merged.set(productId, {
          productId,
          description:
            typeof raw?.description === "string"
              ? raw.description.trim() || null
              : null,
          quantity,
          unitCostPaise,
          gstRate: safeGstRate,
        });
      }
    }

    const items =
      Array.from(merged.values());

    const productIds =
      items.map(
        (item) => item.productId
      );

    const products =
      await prisma.product.findMany({
        where: {
          id: {
            in: productIds,
          },
        },
        select: {
          id: true,
          name: true,
          active: true,
        },
      });

    const productMap = new Map(
      products.map((product) => [
        product.id,
        product,
      ])
    );

    for (const item of items) {
      const product =
        productMap.get(item.productId);

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            error:
              "One or more selected products do not exist.",
          },
          { status: 400 }
        );
      }

      if (product.active === false) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Product "${product.name}" is inactive.`,
          },
          { status: 400 }
        );
      }
    }

    let subtotalPaise = 0;
    let gstPaise = 0;

    const preparedItems =
      items.map((item) => {
        const taxable =
          item.unitCostPaise *
          item.quantity;

        const gst =
          Math.round(
            taxable *
              item.gstRate /
              100
          );

        const total =
          taxable + gst;

        subtotalPaise += taxable;
        gstPaise += gst;

        return {
          ...item,
          taxableAmountPaise: taxable,
          gstPaise: gst,
          totalPaise: total,
        };
      });

    const deliveryPaise =
      toPaise(body.deliveryCharge);

    const totalPaise =
      subtotalPaise +
      gstPaise +
      deliveryPaise;

    const created =
      await prisma.$transaction(
        async (tx) => {
          const purchaseOrder =
            await tx.purchaseOrder.create({
              data: {
                poNumber: makePoNumber(),
                supplierId,
                status: "DRAFT",
                subtotalPaise,
                gstPaise,
                deliveryPaise,
                totalPaise,
                notes,
              },
            });

          await tx.purchaseOrderItem.createMany({
            data: preparedItems.map(
              (item) => ({
                purchaseOrderId:
                  purchaseOrder.id,
                productId:
                  item.productId,
                description:
                  item.description,
                quantity:
                  item.quantity,
                unitCostPaise:
                  item.unitCostPaise,
                gstRate:
                  item.gstRate,
                taxableAmountPaise:
                  item.taxableAmountPaise,
                gstPaise:
                  item.gstPaise,
                totalPaise:
                  item.totalPaise,
                receivedQuantity: 0,
              })
            ),
          });

          await writeAuditLog({
            db: tx,
            actorUserId: user.id,
            actorRole: user.role,
            ...getRequestAuditMeta(request),
            action: "PURCHASE_ORDER_CREATE",
            entityType: "PurchaseOrder",
            entityId: purchaseOrder.id,
            description:
              `Created purchase order ${purchaseOrder.poNumber}.`,
            newValues: {
              poNumber:
                purchaseOrder.poNumber,
              supplierId,
              status: "DRAFT",
              subtotalPaise,
              gstPaise,
              deliveryPaise,
              totalPaise,
              itemCount:
                preparedItems.length,
            },
          });

          return purchaseOrder;
        }
      );

    return NextResponse.json(
      {
        success: true,
        purchaseOrder: created,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Purchase order POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create purchase order.",
      },
      { status: 500 }
    );
  }
}