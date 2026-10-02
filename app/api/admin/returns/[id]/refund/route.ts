import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireCurrentAdminUser,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

function generatePaymentNumber() {
  const now = new Date();

  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const random = Math.floor(100000 + Math.random() * 900000);

  return `PAY-${date}-${random}`;
}

function generateLedgerNumber() {
  const now = new Date();

  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const random = Math.floor(100000 + Math.random() * 900000);

  return `LED-${date}-${random}`;
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const user = await requireCurrentAdminUser();

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Sales return ID is required.",
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const requestedAmount =
      body.amount === undefined ||
      body.amount === null ||
      body.amount === ""
        ? null
        : Number(body.amount);

    const method = String(
      body.method ?? "BANK_TRANSFER"
    ).trim();

    const reference = body.reference
      ? String(body.reference).trim()
      : null;

    const notes = body.notes
      ? String(body.notes).trim()
      : null;

    if (requestedAmount !== null) {
      if (
        !Number.isFinite(requestedAmount) ||
        requestedAmount <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Refund amount must be greater than zero.",
          },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const salesReturn = await tx.salesReturn.findUnique({
        where: {
          id,
        },
      });

      if (!salesReturn) {
        throw new Error("Sales return not found.");
      }

      if (salesReturn.status === "CANCELLED") {
        throw new Error(
          "Cancelled sales returns cannot be refunded."
        );
      }

      if (salesReturn.refundStatus === "REFUNDED") {
        throw new Error(
          "This sales return has already been refunded."
        );
      }

      if (salesReturn.refundStatus === "PROCESSING") {
        throw new Error(
          "This sales return already has a refund in processing."
        );
      }

      const refundAmount =
        requestedAmount === null
          ? salesReturn.refundAmount
          : requestedAmount;

      if (
        !Number.isFinite(refundAmount) ||
        refundAmount <= 0
      ) {
        throw new Error(
          "No valid refund amount is available."
        );
      }

      if (refundAmount > salesReturn.refundAmount) {
        throw new Error(
          `Refund amount cannot exceed the approved refund amount of ₹${salesReturn.refundAmount.toFixed(
            2
          )}.`
        );
      }

      /*
       * Prevent duplicate refund payments linked to this return.
       * Payment has no direct salesReturnId column, so the
       * canonical link is maintained through LedgerEntry.referenceId.
       */
      const existingRefundLedger =
        await tx.ledgerEntry.findFirst({
          where: {
            referenceType: "SalesReturn",
            referenceId: salesReturn.id,
            entryType: "REFUND",
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      if (existingRefundLedger) {
        throw new Error(
          "A refund transaction already exists for this sales return."
        );
      }

      const paymentNumber = generatePaymentNumber();

      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          type: "REFUND",
          status: "SUCCESS",
          orderId: salesReturn.orderId,
          amountPaise: Math.round(
            refundAmount * 100
          ),
          method,
          reference,
          notes:
            notes ??
            `Refund for sales return ${salesReturn.returnNumber}`,
        },
      });

      const ledgerNumber = generateLedgerNumber();

      const ledger = await tx.ledgerEntry.create({
        data: {
          ledgerNumber,
          entryType: "REFUND",
          accountType: "CUSTOMER",
          accountId: salesReturn.customerId,
          orderId: salesReturn.orderId,
          paymentId: payment.id,
          amountPaise: Math.round(
            refundAmount * 100
          ),
          description: `Customer refund for sales return ${salesReturn.returnNumber}`,
          referenceType: "SalesReturn",
          referenceId: salesReturn.id,
        },
      });

      const updatedReturn =
        await tx.salesReturn.update({
          where: {
            id: salesReturn.id,
          },
          data: {
            refundStatus: "REFUNDED",
            refundAmount,
            updatedAt: new Date(),
          },
        });

      await writeAuditLog({
        db: tx,
        actorUserId: user.id,
        actorRole: user.role,
        ...getRequestAuditMeta(request),
        action: "REFUND_CREATE",
        entityType: "SalesReturn",
        entityId: salesReturn.id,
        description: `Refund of ₹${refundAmount.toFixed(
          2
        )} processed for sales return ${salesReturn.returnNumber}.`,
        oldValues: {
          refundStatus: salesReturn.refundStatus,
          refundAmount: salesReturn.refundAmount,
        },
        newValues: {
          refundStatus: updatedReturn.refundStatus,
          refundAmount: updatedReturn.refundAmount,
          paymentId: payment.id,
          paymentNumber: payment.paymentNumber,
          ledgerId: ledger.id,
          ledgerNumber: ledger.ledgerNumber,
          method,
          reference,
        },
        reason:
          notes ??
          `Refund for sales return ${salesReturn.returnNumber}`,
        referenceType: "SalesReturn",
        referenceId: salesReturn.id,
      });

      await writeAuditLog({
        db: tx,
        actorUserId: user.id,
        actorRole: user.role,
        ...getRequestAuditMeta(request),
        action: "PAYMENT_CREATE",
        entityType: "Payment",
        entityId: payment.id,
        description: `Refund payment ${payment.paymentNumber} created for sales return ${salesReturn.returnNumber}.`,
        newValues: {
          paymentNumber: payment.paymentNumber,
          type: payment.type,
          status: payment.status,
          amountPaise: payment.amountPaise,
          method: payment.method,
          reference: payment.reference,
          orderId: payment.orderId,
        },
        referenceType: "SalesReturn",
        referenceId: salesReturn.id,
      });

      await writeAuditLog({
        db: tx,
        actorUserId: user.id,
        actorRole: user.role,
        ...getRequestAuditMeta(request),
        action: "LEDGER_CREATE",
        entityType: "LedgerEntry",
        entityId: ledger.id,
        description: `Customer refund ledger entry ${ledger.ledgerNumber} created.`,
        newValues: {
          ledgerNumber: ledger.ledgerNumber,
          entryType: ledger.entryType,
          accountType: ledger.accountType,
          accountId: ledger.accountId,
          amountPaise: ledger.amountPaise,
          paymentId: ledger.paymentId,
          referenceType: ledger.referenceType,
          referenceId: ledger.referenceId,
        },
        referenceType: "SalesReturn",
        referenceId: salesReturn.id,
      });

      return {
        salesReturn: updatedReturn,
        payment,
        ledger,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Sales return refund processed successfully.",
      return: result.salesReturn,
      payment: result.payment,
      ledger: result.ledger,
    });
  } catch (error) {
    console.error(
      "POST /api/admin/returns/[id]/refund error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to process refund.";

    const status =
      message.includes("not found") ||
      message.includes("cannot") ||
      message.includes("already") ||
      message.includes("exceed") ||
      message.includes("valid refund")
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