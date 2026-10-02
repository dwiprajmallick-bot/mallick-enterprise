import { NextResponse } from "next/server";
import {
  requireCurrentAdminUser,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCurrentAdminUser(request);
    const { id } = await context.params;

    const body = await request.json().catch(() => ({}));

    const reason =
      typeof body?.reason === "string"
        ? body.reason.trim()
        : "";

    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          error: "Refund reversal reason is required.",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const salesReturn = await tx.salesReturn.findUnique({
        where: { id },
      });

      if (!salesReturn) {
        throw new Error("Sales Return not found.");
      }

      if (salesReturn.status === "CANCELLED") {
        throw new Error(
          "A cancelled Sales Return cannot have its refund reversed."
        );
      }

      const refundPayment = await tx.payment.findFirst({
        where: {
          orderId: salesReturn.orderId,
          type: "REFUND",
          status: "SUCCESS",
          notes: {
            contains: salesReturn.returnNumber,
          },
        },
        orderBy: {
          paidAt: "desc",
        },
      });

      if (!refundPayment) {
        throw new Error(
          "No successful refund payment was found for this Sales Return."
        );
      }

      const existingReversal = await tx.payment.findFirst({
        where: {
          reversalOfPaymentId: refundPayment.id,
        },
      });

      if (existingReversal) {
        throw new Error(
          "This refund has already been reversed."
        );
      }

      const reversalAmountPaise = refundPayment.amountPaise;

      if (reversalAmountPaise <= 0) {
        throw new Error(
          "Refund reversal amount must be greater than zero."
        );
      }

      const datePart = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");

      const randomPart = Math.random()
        .toString(36)
        .slice(2, 10)
        .toUpperCase();

      const reversalPayment =
        await tx.payment.create({
          data: {
            paymentNumber:
              `PAY-REV-${datePart}-${randomPart}`,
            type: "REFUND_REVERSAL",
            status: "SUCCESS",
            orderId: salesReturn.orderId,
            amountPaise: reversalAmountPaise,
            method: refundPayment.method,
            reference:
              refundPayment.reference
                ? `REVERSAL OF ${refundPayment.reference}`
                : `REVERSAL OF ${refundPayment.paymentNumber}`,
            reversalOfPaymentId: refundPayment.id,
            notes:
              `Refund reversal for Sales Return ${salesReturn.returnNumber}. Reason: ${reason}`,
          },
        });

      const ledgerRandom =
        Math.random()
          .toString(36)
          .slice(2, 10)
          .toUpperCase();

      const reversalLedger =
        await tx.ledgerEntry.create({
          data: {
            ledgerNumber:
              `LED-REV-${datePart}-${ledgerRandom}`,
            entryType: "REFUND_REVERSAL",
            accountType: "CUSTOMER",
            accountId: salesReturn.customerId,
            orderId: salesReturn.orderId,
            paymentId: reversalPayment.id,
            amountPaise: reversalAmountPaise,
            description:
              `Refund reversal for Sales Return ${salesReturn.returnNumber}. ${reason}`,
            referenceType: "SalesReturn",
            referenceId: salesReturn.id,
          },
        });

      const updatedReturn =
        await tx.salesReturn.update({
          where: { id: salesReturn.id },
          data: {
            refundStatus: "PENDING",
            refundAmount: 0,
            notes: salesReturn.notes
              ? `${salesReturn.notes}\nRefund reversed: ${reason}`
              : `Refund reversed: ${reason}`,
          },
        });

      await writeAuditLog({
        db: tx,
        actorUserId: user.id,
        actorRole: user.role,
        ...getRequestAuditMeta(request),
        action: "REFUND_REVERSAL",
        entityType: "SalesReturn",
        entityId: salesReturn.id,
        description:
          `Refund reversed for Sales Return ${salesReturn.returnNumber}.`,
        oldValues: {
          refundStatus: salesReturn.refundStatus,
          refundAmount: salesReturn.refundAmount,
          refundPaymentId: refundPayment.id,
          refundAmountPaise:
            refundPayment.amountPaise,
        },
        newValues: {
          refundStatus: "PENDING",
          refundAmount: 0,
          reversalPaymentId: reversalPayment.id,
          reversalLedgerId: reversalLedger.id,
        },
        reason,
        referenceType: "Payment",
        referenceId: reversalPayment.id,
      });

      await writeAuditLog({
        db: tx,
        actorUserId: user.id,
        actorRole: user.role,
        ...getRequestAuditMeta(request),
        action: "PAYMENT_REVERSAL",
        entityType: "Payment",
        entityId: reversalPayment.id,
        description:
          `Refund payment ${refundPayment.paymentNumber} reversed.`,
        oldValues: {
          paymentId: refundPayment.id,
          status: refundPayment.status,
          amountPaise: refundPayment.amountPaise,
          type: refundPayment.type,
        },
        newValues: {
          reversalPaymentId: reversalPayment.id,
          type: reversalPayment.type,
          amountPaise: reversalPayment.amountPaise,
        },
        reason,
        referenceType: "Payment",
        referenceId: refundPayment.id,
      });

      await writeAuditLog({
        db: tx,
        actorUserId: user.id,
        actorRole: user.role,
        ...getRequestAuditMeta(request),
        action: "LEDGER_REVERSAL",
        entityType: "LedgerEntry",
        entityId: reversalLedger.id,
        description:
          `Refund ledger entry reversed for Sales Return ${salesReturn.returnNumber}.`,
        oldValues: {
          originalPaymentId: refundPayment.id,
          originalAmountPaise:
            refundPayment.amountPaise,
        },
        newValues: {
          reversalLedgerId: reversalLedger.id,
          amountPaise: reversalLedger.amountPaise,
          entryType: reversalLedger.entryType,
        },
        reason,
        referenceType: "SalesReturn",
        referenceId: salesReturn.id,
      });

      return {
        salesReturn: updatedReturn,
        originalRefund: refundPayment,
        reversalPayment,
        reversalLedger,
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to reverse refund.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}