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

    const purchase =
      await prisma.$transaction(
        async (tx) => {

          const existing =
            await tx.purchase.findUnique({
              where: {
                id,
              },
            });

          if (!existing) {
            throw new Error(
              "PURCHASE_NOT_FOUND"
            );
          }

          if (
            String(
              existing.status
            ).toUpperCase() ===
            "CANCELLED"
          ) {
            throw new Error(
              "ALREADY_CANCELLED"
            );
          }

          const items =
            await tx.purchaseItem.findMany({
              where: {
                purchaseId:
                  existing.id,
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
                "INVALID_PURCHASE_ITEM"
              );
            }

            if (
              product.stock <
              quantity
            ) {
              throw new Error(
                "INSUFFICIENT_STOCK_TO_REVERSE"
              );
            }

            const previousStock =
              product.stock;

            const newStock =
              previousStock -
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
                    "OUT",
                  quantity:
                    -quantity,
                  previousStock,
                  newStock,
                  note:
                    `Purchase cancellation reversal ${existing.purchaseNumber}`,
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
                AUDIT_ACTIONS.STOCK_OUT,
              entityType:
                "Product",
              entityId:
                product.id,
              description:
                "Purchase stock receipt reversed because purchase was cancelled.",
              oldValues: {
                stock:
                  previousStock,
              },
              newValues: {
                stock:
                  newStock,
                quantity:
                  -quantity,
                movementId:
                  movement.id,
                purchaseId:
                  existing.id,
              },
              reason,
              referenceType:
                "Purchase",
              referenceId:
                existing.id,
            });
          }

          const updated =
            await tx.purchase.update({
              where: {
                id:
                  existing.id,
              },
              data: {
                status:
                  "CANCELLED",
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
              "Purchase",
            entityId:
              existing.id,
            description:
              "Purchase cancelled and received stock reversed.",
            oldValues: {
              status:
                existing.status,
            },
            newValues: {
              status:
                updated.status,
              itemCount:
                items.length,
            },
            reason,
            referenceType:
              "Purchase",
            referenceId:
              existing.id,
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
              "Purchase",
            entityId:
              existing.id,
            description:
              "Purchase stock receipt reversed through cancellation.",
            newValues: {
              status:
                "CANCELLED",
              itemCount:
                items.length,
            },
            reason,
            referenceType:
              "Purchase",
            referenceId:
              existing.id,
          });

          return updated;
        }
      );

    return NextResponse.json({
      success: true,
      purchase,
    });
  } catch (error) {

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
      "PURCHASE_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Purchase not found.",
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
            "Purchase is already cancelled.",
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
      "INVALID_PURCHASE_ITEM"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid purchase quantity.",
        },
        { status: 400 }
      );
    }

    if (
      message ===
      "INSUFFICIENT_STOCK_TO_REVERSE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Current stock is insufficient to reverse this purchase.",
        },
        { status: 409 }
      );
    }

    console.error(
      "Purchase cancellation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Purchase cancellation failed.",
      },
      { status: 500 }
    );
  }
}