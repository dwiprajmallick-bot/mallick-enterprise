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

async function getNetPaid(
  tx: any,
  type: string,
  orderId: string | null,
  purchaseId: string | null
) {
  const positiveType =
    type === "RECEIVE"
      ? "RECEIVE"
      : "PAY";

  const reversalType =
    type === "RECEIVE"
      ? "RECEIVE_REVERSAL"
      : "PAY_REVERSAL";

  const positive =
    await tx.payment.aggregate({
      where: {
        type:
          positiveType,
        status:
          "SUCCESS",
        ...(orderId
          ? { orderId }
          : {}),
        ...(purchaseId
          ? { purchaseId }
          : {}),
      },
      _sum: {
        amountPaise:
          true,
      },
    });

  const reversed =
    await tx.payment.aggregate({
      where: {
        type:
          reversalType,
        status:
          "SUCCESS",
        ...(orderId
          ? { orderId }
          : {}),
        ...(purchaseId
          ? { purchaseId }
          : {}),
      },
      _sum: {
        amountPaise:
          true,
      },
    });

  return Math.max(
    0,
    (positive._sum
      .amountPaise || 0) -
      (reversed._sum
        .amountPaise || 0)
  );
}

export async function GET(
  request: Request
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

  const url =
    new URL(request.url);

  const orderId =
    url.searchParams.get(
      "orderId"
    ) || "";

  const purchaseId =
    url.searchParams.get(
      "purchaseId"
    ) || "";

  const payments =
    await prisma.payment.findMany({
      where: {
        ...(orderId
          ? { orderId }
          : {}),
        ...(purchaseId
          ? { purchaseId }
          : {}),
      },
      orderBy: {
        paidAt:
          "desc",
      },
    });

  await writeAuditLog({
    actorUserId:
      user.id,
    actorRole:
      user.role,
    ...getRequestAuditMeta(
      request
    ),
    action:
      AUDIT_ACTIONS.VIEW,
    entityType:
      "Payment",
    description:
      "Admin viewed payments.",
    newValues: {
      count:
        payments.length,
      orderId,
      purchaseId,
    },
  });

  return NextResponse.json({
    success: true,
    payments,
  });
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
        message: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  try {
    const body =
      await request.json();

    const type =
      String(
        body.type || ""
      )
        .trim()
        .toUpperCase();

    const orderId =
      body.orderId
        ? String(
            body.orderId
          ).trim()
        : null;

    const purchaseId =
      body.purchaseId
        ? String(
            body.purchaseId
          ).trim()
        : null;

    const amountPaise =
      Number(
        body.amountPaise
      );

    const method =
      String(
        body.method ||
          "BANK_TRANSFER"
      ).trim();

    if (
      !["RECEIVE", "PAY"].includes(
        type
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "type must be RECEIVE or PAY.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(
        amountPaise
      ) ||
      amountPaise <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "amountPaise must be a positive integer.",
        },
        { status: 400 }
      );
    }

    if (
      type === "RECEIVE" &&
      !orderId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "orderId is required.",
        },
        { status: 400 }
      );
    }

    if (
      type === "PAY" &&
      !purchaseId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "purchaseId is required.",
        },
        { status: 400 }
      );
    }

    // Payment source exclusivity:
    // RECEIVE payments belong only to an Order.
    // PAY payments belong only to a Purchase.

    if (
      type === "RECEIVE" &&
      purchaseId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "purchaseId must not be provided for RECEIVE payments.",
        },
        { status: 400 }
      );
    }

    if (
      type === "PAY" &&
      orderId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "orderId must not be provided for PAY payments.",
        },
        { status: 400 }
      );
    }

    const payment =
      await prisma.$transaction(
        async (tx) => {

          let sourceTotalPaise =
            0;

          let order = null;
          let purchase = null;

          if (
            type === "RECEIVE"
          ) {

            order =
              await tx.order.findUnique({
                where: {
                  id:
                    orderId!,
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
                  order.totalAmount ||
                    0
                ) * 100
              );
          } else {

            purchase =
              await tx.purchase.findUnique({
                where: {
                  id:
                    purchaseId!,
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

          const alreadyPaid =
            await getNetPaid(
              tx,
              type,
              orderId,
              purchaseId
            );

          const outstanding =
            sourceTotalPaise -
            alreadyPaid;

          if (
            amountPaise >
            outstanding
          ) {
            throw new Error(
              "PAYMENT_EXCEEDS_OUTSTANDING"
            );
          }

          const created =
            await tx.payment.create({
              data: {
                paymentNumber:
                  makeNumber(
                    "PAY"
                  ),
                type,
                status:
                  "SUCCESS",
                orderId,
                purchaseId,
                amountPaise,
                method,
                reference:
                  body.reference
                    ? String(
                        body.reference
                      )
                    : null,
                notes:
                  body.notes
                    ? String(
                        body.notes
                      )
                    : null,
              },
            });

          const newNetPaid =
            alreadyPaid +
            amountPaise;

          const newStatus =
            newNetPaid >=
            sourceTotalPaise
              ? "PAID"
              : "PARTIAL";

          if (
            type === "RECEIVE"
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
                  type === "RECEIVE"
                    ? "CREDIT"
                    : "DEBIT",
                accountType:
                  type === "RECEIVE"
                    ? "CUSTOMER"
                    : "SUPPLIER",
                accountId:
                  type ===
                  "RECEIVE"
                    ? order!.customerId ||
                      null
                    : purchase!.supplierId,
                orderId,
                purchaseId,
                paymentId:
                  created.id,
                amountPaise,
                description:
                  type ===
                  "RECEIVE"
                    ? `Customer payment received for ${order!.orderNumber}`
                    : `Supplier payment paid for ${purchase!.purchaseNumber}`,
                referenceType:
                  "Payment",
                referenceId:
                  created.id,
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
              type ===
              "RECEIVE"
                ? AUDIT_ACTIONS.PAYMENT_RECEIVE
                : AUDIT_ACTIONS.PAYMENT_PAY,
            entityType:
              "Payment",
            entityId:
              created.id,
            description:
              type ===
              "RECEIVE"
                ? "Customer payment received."
                : "Supplier payment paid.",
            newValues:
              created,
            referenceType:
              type ===
              "RECEIVE"
                ? "Order"
                : "Purchase",
            referenceId:
              type ===
              "RECEIVE"
                ? order!.id
                : purchase!.id,
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
              "Payment ledger entry created.",
            newValues:
              ledger,
            referenceType:
              "Payment",
            referenceId:
              created.id,
          });

          return created;
        }
      );

    return NextResponse.json({
      success: true,
      payment,
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
      "PAYMENT_EXCEEDS_OUTSTANDING"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment exceeds outstanding amount.",
        },
        { status: 400 }
      );
    }

    console.error(
      "Payment create error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Payment creation failed.",
      },
      { status: 500 }
    );
  }
}
