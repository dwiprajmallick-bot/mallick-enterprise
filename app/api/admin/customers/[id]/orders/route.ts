import { requireCurrentAdminUser } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import {

  AUDIT_ACTIONS,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function makeOrderNumber() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(
    2,
    "0"
  );
  const day = String(now.getDate()).padStart(
    2,
    "0"
  );

  const random = Math.floor(
    100000 + Math.random() * 900000
  );

  return `OK-${year}${month}${day}-${random}`;
}

async function isAdminAuthenticated() {
  const user =
    await requireCurrentAdminUser();

  return Boolean(user);
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const { id: customerId } =
      await context.params;

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer ID is required.",
        },
        { status: 400 }
      );
    }

    const body =
      await request.json();

    const productId =
      String(
        body.productId || ""
      ).trim();

    const quantity =
      Number(body.quantity);

    const notes =
      body.notes === null ||
      body.notes === undefined
        ? null
        : String(body.notes).trim() ||
          null;

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Quantity must be a positive integer.",
        },
        { status: 400 }
      );
    }

    const {
      ipAddress,
      userAgent,
    } = getRequestAuditMeta(request);

    const result =
      await prisma.$transaction(
        async (tx) => {
          const customer =
            await tx.customer.findUnique({
              where: {
                id: customerId,
              },
            });

          if (!customer) {
            throw new Error(
              "CUSTOMER_NOT_FOUND"
            );
          }

          const product =
            await tx.product.findUnique({
              where: {
                id: productId,
              },
            });

          if (!product) {
            throw new Error(
              "PRODUCT_NOT_FOUND"
            );
          }

          if (!product.active) {
            throw new Error(
              "PRODUCT_INACTIVE"
            );
          }

          if (
            product.stock < quantity
          ) {
            throw new Error(
              "INSUFFICIENT_STOCK"
            );
          }

          const previousStock =
            product.stock;

          const newStock =
            previousStock - quantity;

          const sellingPrice =
            product.sellingPrice;

          const purchasePrice =
            product.purchasePrice;

          const totalPrice =
            sellingPrice * quantity;

          const orderNumber =
            makeOrderNumber();

          const order =
            await tx.order.create({
              data: {
                orderNumber,
                customerId:
                  customer.id,

                subtotal:
                  totalPrice,
                deliveryCharge: 0,
                gstAmount: 0,
                totalAmount:
                  totalPrice,

                paymentStatus:
                  "PENDING",
                orderStatus:
                  "PENDING",
                paymentMethod:
                  "COD",

                shippingName:
                  customer.name,
                shippingPhone:
                  customer.phone,
                shippingAddress: "",
                shippingCity: "",
                shippingState: "",
                shippingPincode: "",

                notes,

                items: {
                  create: {
                    productId:
                      product.id,
                    productName:
                      product.name,
                    quantity,
                    unit:
                      product.unit,
                    purchasePrice,
                    sellingPrice,
                    totalPrice,
                  },
                },
              },

              include: {
                customer: true,
                items: true,
              },
            });

          const updatedProduct =
            await tx.product.update({
              where: {
                id: product.id,
              },
              data: {
                stock: newStock,
              },
            });

          const movement =
            await tx.stockMovement.create({
              data: {
                productId:
                  product.id,
                type: "SALE",
                quantity:
                  -quantity,
                previousStock,
                newStock,
                note:
                  `Admin-created order ${order.orderNumber}`,
                orderId:
                  order.id,
              },
            });

          await writeAuditLog({
            db: tx,
            actorRole: "ADMIN",
            action: AUDIT_ACTIONS.CREATE,
            entityType: "Order",
            entityId: order.id,
            description:
              "Admin created an order for an existing customer.",
            newValues: {
              id: order.id,
              orderNumber:
                order.orderNumber,
              customerId:
                customer.id,
              subtotal:
                order.subtotal,
              deliveryCharge:
                order.deliveryCharge,
              gstAmount:
                order.gstAmount,
              totalAmount:
                order.totalAmount,
              paymentStatus:
                order.paymentStatus,
              orderStatus:
                order.orderStatus,
              paymentMethod:
                order.paymentMethod,
              items:
                order.items.map(
                  (item) => ({
                    id: item.id,
                    productId:
                      item.productId,
                    productName:
                      item.productName,
                    quantity:
                      item.quantity,
                    unit:
                      item.unit,
                    sellingPrice:
                      item.sellingPrice,
                    totalPrice:
                      item.totalPrice,
                  })
                ),
            },
            referenceType:
              "Customer",
            referenceId:
              customer.id,
            ipAddress,
            userAgent,
          });

          await writeAuditLog({
            db: tx,
            actorRole: "ADMIN",
            action:
              AUDIT_ACTIONS.SALE,
            entityType:
              "Product",
            entityId:
              product.id,
            description:
              "Product sold through admin-created customer order.",
            newValues: {
              productId:
                product.id,
              productName:
                product.name,
              quantity,
              unit:
                product.unit,
              sellingPrice,
              totalPrice,
            },
            referenceType:
              "Order",
            referenceId:
              order.id,
            ipAddress,
            userAgent,
          });

          await writeAuditLog({
            db: tx,
            actorRole: "ADMIN",
            action:
              AUDIT_ACTIONS.STOCK_OUT,
            entityType:
              "Product",
            entityId:
              product.id,
            description:
              "Stock reduced for admin-created sale.",
            oldValues: {
              stock:
                previousStock,
            },
            newValues: {
              stock:
                updatedProduct.stock,
            },
            reason:
              `Sale against order ${order.orderNumber}.`,
            referenceType:
              "StockMovement",
            referenceId:
              movement.id,
            ipAddress,
            userAgent,
          });

          await writeAuditLog({
            db: tx,
            actorRole: "ADMIN",
            action:
              AUDIT_ACTIONS.GST_CREATE,
            entityType:
              "Order",
            entityId:
              order.id,
            description:
              "GST value recorded for admin-created order.",
            newValues: {
              taxableAmount:
                order.subtotal +
                order.deliveryCharge,
              gstRate: 0,
              gstAmount:
                order.gstAmount,
              totalAmount:
                order.totalAmount,
            },
            referenceType:
              "Order",
            referenceId:
              order.id,
            ipAddress,
            userAgent,
          });

          return {
            order,
            movement,
          };
        }
      );

    return NextResponse.json(
      {
        success: true,
        message:
          "Order created successfully.",
        data: result.order,
        stockMovement:
          result.movement,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        "CUSTOMER_NOT_FOUND"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Customer not found.",
          },
          { status: 404 }
        );
      }

      if (
        error.message ===
        "PRODUCT_NOT_FOUND"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Product not found.",
          },
          { status: 404 }
        );
      }

      if (
        error.message ===
        "PRODUCT_INACTIVE"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This product is inactive.",
          },
          { status: 400 }
        );
      }

      if (
        error.message ===
        "INSUFFICIENT_STOCK"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Insufficient product stock.",
          },
          { status: 400 }
        );
      }
    }

    console.error(
      "CREATE CUSTOMER ORDER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to create order.",
      },
      { status: 500 }
    );
  }
}
