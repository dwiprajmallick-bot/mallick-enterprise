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
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

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
        message:
          "Unauthorized.",
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
            "Reversal reason is required.",
        },
        { status: 400 }
      );
    }

    const reversal =
      await prisma.$transaction(
        async (tx) => {

          const original =
            await tx.payment.findUnique({
              where: {
                id,
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

          const existing =
            await tx.payment.findFirst({
              where: {
                reversalOfPaymentId:
                  original.id,
                status:
                  "SUCCESS",
              },
            });

          if (existing) {
            throw new Error(
              "ALREADY_REVERSED"
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
              "UNSUPPORTED_PAYMENT_TYPE"
            );
          }

          const created =
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
                paidAt:
                  new Date(),
              },
            });

          let sourceTotalPaise =
            0;

          let newNetPaid =
            0;

          if (
            original.orderId
          ) {

            const order =
              await tx.order.findUnique({
                where: {
                  id:
                    original.orderId,
                },
              });

            if (order) {
              sourceTotalPaise =
                Math.round(
                  Number(
                    order.totalAmount ||
                      0
                  ) * 100
                );

              const received =
                await tx.payment.aggregate({
                  where: {
                    orderId:
                      original.orderId,
                    status:
                      "SUCCESS",
                    type:
                      "RECEIVE",
                  },
                  _sum: {
                    amountPaise:
                      true,
                  },
                });

              const reversed =
                await tx.payment.aggregate({
                  where: {
                    orderId:
                      original.orderId,
                    status:
                      "SUCCESS",
                    type:
                      "RECEIVE_REVERSAL",
                  },
                  _sum: {
                    amountPaise:
                      true,
                  },
                });

              newNetPaid =
                Math.max(
                  0,
                  (received._sum
                    .amountPaise ||
                    0) -
                    (reversed._sum
                      .amountPaise ||
                      0)
                );

              const status =
                newNetPaid >=
                sourceTotalPaise
                  ? "PAID"
                  : newNetPaid > 0
                    ? "PARTIAL"
                    : "UNPAID";

              await tx.order.update({
                where: {
                  id:
                    original.orderId,
                },
                data: {
                  paymentStatus:
                    status,
                },
              });

              const invoice =
                await tx.invoice.findUnique({
                  where: {
                    orderId:
                      original.orderId,
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
                      status,
                  },
                });
              }
            }
          }

          if (
            original.purchaseId
          ) {

            const purchase =
              await tx.purchase.findUnique({
                where: {
                  id:
                    original.purchaseId,
                },
              });

            if (purchase) {

              sourceTotalPaise =
                purchase.totalPaise;

              const paid =
                await tx.payment.aggregate({
                  where: {
                    purchaseId:
                      original.purchaseId,
                    status:
                      "SUCCESS",
                    type:
                      "PAY",
                  },
                  _sum: {
                    amountPaise:
                      true,
                  },
                });

              const reversed =
                await tx.payment.aggregate({
                  where: {
                    purchaseId:
                      original.purchaseId,
                    status:
                      "SUCCESS",
                    type:
                      "PAY_REVERSAL",
                  },
                  _sum: {
                    amountPaise:
                      true,
                  },
                });

              newNetPaid =
                Math.max(
                  0,
                  (paid._sum
                    .amountPaise ||
                    0) -
                    (reversed._sum
                      .amountPaise ||
                      0)
                );

              const status =
                newNetPaid >=
                sourceTotalPaise
                  ? "PAID"
                  : newNetPaid > 0
                    ? "PARTIAL"
                    : "UNPAID";

              await tx.purchase.update({
                where: {
                  id:
                    original.purchaseId,
                },
                data: {
                  paymentStatus:
                    status,
                },
              });
            }
          }

          const ledger =
            await tx.ledgerEntry.create({
              data: {
                ledgerNumber:
                  makeNumber(
                    "LEDREV"
                  ),
                entryType:
                  original.type ===
                  "RECEIVE"
                    ? "DEBIT"
                    : "CREDIT",
                accountType:
                  original.orderId
                    ? "CUSTOMER"
                    : "SUPPLIER",
                accountId:
                  original.orderId
                    ? (
                        await tx.order.findUnique({
                          where: {
                            id: original.orderId,
                          },
                          select: {
                            customerId: true,
                          },
                        })
                      )?.customerId ?? null
                    : original.purchaseId
                      ? (
                          await tx.purchase.findUnique({
                            where: {
                              id: original.purchaseId,
                            },
                            select: {
                              supplierId: true,
                            },
                          })
                        )?.supplierId ?? null
                      : null,
                orderId:
                  original.orderId,
                purchaseId:
                  original.purchaseId,
                paymentId:
                  created.id,
                amountPaise:
                  created.amountPaise,
                description:
                  `Reversal of payment ${original.paymentNumber}`,
                referenceType:
                  "PaymentReversal",
                referenceId:
                  original.id,
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
              created.id,
            description:
              "Payment reversed without deleting original payment.",
            oldValues: {
              paymentId:
                original.id,
              paymentNumber:
                original.paymentNumber,
              amountPaise:
                original.amountPaise,
            },
            newValues: {
              reversalId:
                created.id,
              amountPaise:
                created.amountPaise,
              reason,
            },
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
              "Reversal ledger entry created.",
            newValues:
              ledger,
            reason,
            referenceType:
              "PaymentReversal",
            referenceId:
              original.id,
          });

          return created;
        }
      );

    return NextResponse.json({
      success: true,
      reversal,
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
            "Payment is not reversible in its current status.",
        },
        { status: 400 }
      );
    }

    if (
      message ===
      "ALREADY_REVERSED"
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
      "UNSUPPORTED_PAYMENT_TYPE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This payment type does not support reversal.",
        },
        { status: 400 }
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
