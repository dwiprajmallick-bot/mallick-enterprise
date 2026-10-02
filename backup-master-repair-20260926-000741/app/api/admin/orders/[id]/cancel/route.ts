import { NextResponse } from "next/server";

import {
  requireCurrentAdminUser,
} from "@/lib/admin-auth";

import {
  AUDIT_ACTIONS,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  context: Context
) {
  const user =
    await requireCurrentAdminUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  const { id } =
    await context.params;

  try {
    const body =
      await request.json();

    const reason =
      String(
        body.reason || ""
      ).trim();

    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cancellation reason is required.",
        },
        { status: 400 }
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {

          const order =
            await tx.order.findUnique({
              where: {
                id,
              },
            });

          if (!order) {
            throw new Error(
              "ORDER_NOT_FOUND"
            );
          }

          if (
            String(
              order.orderStatus
            ).toUpperCase() ===
            "CANCELLED"
          ) {
            throw new Error(
              "ALREADY_CANCELLED"
            );
          }

          const items =
            await tx.orderItem.findMany({
              where: {
                orderId:
                  order.id,
              },
            });

          for (
            const item of items
          ) {

            const product =
              await tx.product.findUnique({
                where: {
                  id:
                    item.productId,
                },
              });

            if (!product) {
              throw new Error(
                "PRODUCT_NOT_FOUND"
              );
            }

            const quantity =
              Number(
                item.quantity
              );

            if (
              !Number.isInteger(
                quantity
              ) ||
              quantity <= 0
            ) {
              throw new Error(
                "INVALID_ORDER_ITEM"
              );
            }

            const previousStock =
              product.stock;

            const newStock =
              previousStock +
              quantity;

            await tx.product.update({
              where: {
                id:
                  product.id,
              },
              data: {
                stock:
                  newStock,
              },
            });

            const movement =
              await tx.stockMovement.create({
                data: {
                  productId:
                    product.id,
                  type:
                    "IN",
                  quantity,
                  previousStock,
                  newStock,
                  note:
                    `Order cancellation reversal ${order.orderNumber}`,
                  orderId:
                    order.id,
                },
              });

            await writeAuditLog({
              db: tx,
              actorUserId:
                user.id,
              actorRole:
                user.role,
              ...getRequestAuditMeta(
                request
              ),
              action:
                AUDIT_ACTIONS.STOCK_IN,
              entityType:
                "Product",
              entityId:
                product.id,
              description:
                "Stock restored because order was cancelled.",
              oldValues: {
                stock:
                  previousStock,
              },
              newValues: {
                stock:
                  newStock,
                quantity,
                movementId:
                  movement.id,
                orderId:
                  order.id,
              },
              reason,
              referenceType:
                "Order",
              referenceId:
                order.id,
            });
          }

          const updated =
            await tx.order.update({
              where: {
                id:
                  order.id,
              },
              data: {
                orderStatus: "CANCELLED",
              },
            });

          await writeAuditLog({
            db: tx,
            actorUserId:
              user.id,
            actorRole:
              user.role,
            ...getRequestAuditMeta(
              request
            ),
            action:
              AUDIT_ACTIONS.CORRECTION,
            entityType:
              "Order",
            entityId:
              order.id,
            description:
              "Order cancelled and sold stock restored.",
            oldValues: {
              status:
                order.orderStatus,
            },
            newValues: {
              status:
                updated.orderStatus,
              stockRestored:
                items.length > 0,
              itemCount:
                items.length,
            },
            reason,
            referenceType:
              "Order",
            referenceId:
              order.id,
          });

          await writeAuditLog({
            db: tx,
            actorUserId:
              user.id,
            actorRole:
              user.role,
            ...getRequestAuditMeta(
              request
            ),
            action:
              AUDIT_ACTIONS.REVERSAL,
            entityType:
              "Order",
            entityId:
              order.id,
            description:
              "Order stock movement reversed through cancellation.",
            newValues: {
              orderStatus: "CANCELLED",
              itemCount:
                items.length,
            },
            reason,
            referenceType:
              "Order",
            referenceId:
              order.id,
          });

          return updated;
        }
      );

    return NextResponse.json({
      success: true,
      order: result,
    });
  } catch (error) {

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
      "ORDER_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Order not found.",
        },
        { status: 404 }
      );
    }

    if (
      message ===
      "ALREADY_CANCELLED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Order is already cancelled.",
        },
        { status: 409 }
      );
    }

    if (
      message ===
      "PRODUCT_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "One or more products were not found.",
        },
        { status: 404 }
      );
    }

    if (
      message ===
      "INVALID_ORDER_ITEM"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid order item quantity.",
        },
        { status: 400 }
      );
    }

    console.error(
      "Order cancellation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Order cancellation failed.",
      },
      { status: 500 }
    );
  }
}