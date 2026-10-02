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

function makeNumber(
  prefix: string
) {
  const stamp =
    new Date()
      .toISOString()
      .replace(/\D/g, "")
      .slice(0, 14);

  const random =
    Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase();

  return `${prefix}-${stamp}-${random}`;
}

export async function POST(
  request: Request
) {
  const user =
    await requireCurrentAdminUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Unauthorized.",
      },
      { status: 401 }
    );
  }

  try {
    const body =
      await request.json();

    const paymentId =
      String(
        body.paymentId || ""
      ).trim();

    const reason =
      String(
        body.reason || ""
      ).trim();

    if (!paymentId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "paymentId is required.",
        },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Reversal reason is required.",
        },
        { status: 400 }
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {

          const original =
            await tx.payment.findUnique({
              where: {
                id:
                  paymentId,
              },
            });

          if (!original) {
            throw new Error(
              "PAYMENT_NOT_FOUND"
            );
          }

          if (
            original.status !==
            "SUCCESS"
          ) {
            throw new Error(
              "PAYMENT_NOT_REVERSIBLE"
            );
          }

          if (
            original.type ===
              "RECEIVE_REVERSAL" ||
            original.type ===
              "PAY_REVERSAL"
          ) {
            throw new Error(
              "PAYMENT_NOT_REVERSIBLE"
            );
          }

          const existingReversal =
            await tx.payment.findFirst({
              where: {
                reversalOfPaymentId:
                  original.id,
                status:
                  "SUCCESS",
              },
            });

          if (existingReversal) {
            throw new Error(
              "PAYMENT_ALREADY_REVERSED"
            );
          }

          const reversalType =
            original.type ===
            "RECEIVE"
              ? "RECEIVE_REVERSAL"
              : original.type ===
                  "PAY"
                ? "PAY_REVERSAL"
                : null;

          if (!reversalType) {
            throw new Error(
              "INVALID_PAYMENT_TYPE"
            );
          }

          let sourceTotalPaise = 0;
          let order = null;
          let purchase = null;

          if (
            original.type ===
            "RECEIVE"
          ) {
            if (!original.orderId) {
              throw new Error(
                "ORDER_NOT_FOUND"
              );
            }

            order =
              await tx.order.findUnique({
                where: {
                  id:
                    original.orderId,
                },
              });

            if (!order) {
              throw new Error(
                "ORDER_NOT_FOUND"
              );
            }

            sourceTotalPaise =
              Math.round(
                Number(
                  order.totalAmount || 0
                ) * 100
              );
          } else {
            if (!original.purchaseId) {
              throw new Error(
                "PURCHASE_NOT_FOUND"
              );
            }

            purchase =
              await tx.purchase.findUnique({
                where: {
                  id:
                    original.purchaseId,
                },
              });

            if (!purchase) {
              throw new Error(
                "PURCHASE_NOT_FOUND"
              );
            }

            sourceTotalPaise =
              purchase.totalPaise;
          }

          const positive =
            await tx.payment.aggregate({
              where: {
                type:
                  original.type,
                status:
                  "SUCCESS",
                ...(original.orderId
                  ? {
                      orderId:
                        original.orderId,
                    }
                  : {}),
                ...(original.purchaseId
                  ? {
                      purchaseId:
                        original.purchaseId,
                    }
                  : {}),
              },
              _sum: {
                amountPaise:
                  true,
              },
            });

          const reversals =
            await tx.payment.aggregate({
              where: {
                type:
                  reversalType,
                status:
                  "SUCCESS",
                ...(original.orderId
                  ? {
                      orderId:
                        original.orderId,
                    }
                  : {}),
                ...(original.purchaseId
                  ? {
                      purchaseId:
                        original.purchaseId,
                    }
                  : {}),
              },
              _sum: {
                amountPaise:
                  true,
              },
            });

          const netPaid =
            Math.max(
              0,
              (positive._sum
                .amountPaise || 0) -
                (reversals._sum
                  .amountPaise || 0)
            );

          let newStatus: string;

          if (
            netPaid >=
            sourceTotalPaise
          ) {
            newStatus =
              "PAID";
          } else if (
            netPaid > 0
          ) {
            newStatus =
              "PARTIAL";
          } else {
            newStatus =
              original.type ===
              "RECEIVE"
                ? "PENDING"
                : "UNPAID";
          }

          const reversal =
            await tx.payment.create({
              data: {
                paymentNumber:
                  makeNumber(
                    "REV"
                  ),
                type:
                  reversalType,
                status:
                  "SUCCESS",
                orderId:
                  original.orderId,
                purchaseId:
                  original.purchaseId,
                amountPaise:
                  original.amountPaise,
                method:
                  original.method,
                reversalOfPaymentId:
                  original.id,
                reference:
                  `REVERSAL:${original.id}`,
                notes:
                  reason,
              },
            });

          if (
            original.type ===
            "RECEIVE"
          ) {
            await tx.order.update({
              where: {
                id:
                  order!.id,
              },
              data: {
                paymentStatus:
                  newStatus,
              },
            });

            const invoice =
              await tx.invoice.findUnique({
                where: {
                  orderId:
                    order!.id,
                },
              });

            if (invoice) {
              await tx.invoice.update({
                where: {
                  id:
                    invoice.id,
                },
                data: {
                  paymentStatus:
                    newStatus,
                },
              });
            }
          } else {
            await tx.purchase.update({
              where: {
                id:
                  purchase!.id,
              },
              data: {
                paymentStatus:
                  newStatus,
              },
            });
          }

          const ledger =
            await tx.ledgerEntry.create({
              data: {
                ledgerNumber:
                  makeNumber(
                    "LED"
                  ),
                entryType:
                  original.type ===
                  "RECEIVE"
                    ? "DEBIT"
                    : "CREDIT",
                accountType:
                  original.type ===
                  "RECEIVE"
                    ? "CUSTOMER"
                    : "SUPPLIER",
                accountId:
                  original.type ===
                  "RECEIVE"
                    ? order!.customerId
                    : purchase!.supplierId,
                orderId:
                  original.orderId,
                purchaseId:
                  original.purchaseId,
                paymentId:
                  reversal.id,
                amountPaise:
                  reversal.amountPaise,
                description:
                  original.type ===
                  "RECEIVE"
                    ? `Customer payment reversal for ${order!.orderNumber}`
                    : `Supplier payment reversal for ${purchase!.purchaseNumber}`,
                referenceType:
                  "PaymentReversal",
                referenceId:
                  reversal.id,
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
              AUDIT_ACTIONS.REVERSAL,
            entityType:
              "Payment",
            entityId:
              reversal.id,
            description:
              "Payment reversed.",
            oldValues:
              original,
            newValues:
              reversal,
            reason,
            referenceType:
              "Payment",
            referenceId:
              original.id,
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
              AUDIT_ACTIONS.LEDGER_CREATE,
            entityType:
              "LedgerEntry",
            entityId:
              ledger.id,
            description:
              "Payment reversal ledger entry created.",
            newValues:
              ledger,
            reason,
            referenceType:
              "Payment",
            referenceId:
              original.id,
          });

          return {
            reversal,
            ledger,
            paymentStatus:
              newStatus,
          };
        }
      );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
      "PAYMENT_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment not found.",
        },
        { status: 404 }
      );
    }

    if (
      message ===
      "PAYMENT_NOT_REVERSIBLE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This payment cannot be reversed.",
        },
        { status: 409 }
      );
    }

    if (
      message ===
      "PAYMENT_ALREADY_REVERSED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This payment has already been reversed.",
        },
        { status: 409 }
      );
    }

    if (
      message ===
      "INVALID_PAYMENT_TYPE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payment type.",
        },
        { status: 400 }
      );
    }

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

    console.error(
      "Payment reversal error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Payment reversal failed.",
      },
      { status: 500 }
    );
  }
}
