import { NextResponse } from "next/server";
import {
  requireCurrentAdminUser,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";
import { prisma } from "@/lib/prisma";

function serializeEntry(entry: any) {
  return {
    id: entry.id,
    ledgerNumber: entry.ledgerNumber,
    entryType: entry.entryType,
    accountType: entry.accountType,
    accountId: entry.accountId,
    orderId: entry.orderId,
    purchaseId: entry.purchaseId,
    paymentId: entry.paymentId,
    amountPaise: entry.amountPaise,
    description: entry.description,
    referenceType: entry.referenceType,
    referenceId: entry.referenceId,
    transactionAt: entry.transactionAt,
    createdAt: entry.createdAt,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCurrentAdminUser(request);
    const { id } = await context.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found.",
        },
        { status: 404 }
      );
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: {
        accountType: "CUSTOMER",
        accountId: customer.id,
      },
      orderBy: [
        {
          transactionAt: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    let balancePaise = 0;

    const ledger = entries.map((entry) => {
      /*
       * Customer account:
       *
       * CREDIT  = amount received / reduction of customer balance
       * DEBIT   = amount owed by customer
       *
       * LedgerEntry stores amount as positive/negative according
       * to the originating transaction where applicable.
       *
       * For historical records where direction is represented
       * by entryType, normalize it here without changing the
       * immutable LedgerEntry itself.
       */

      const type = String(entry.entryType || "").toUpperCase();

      let debitPaise = 0;
      let creditPaise = 0;

      if (
        type === "SALE" ||
        type === "INVOICE" ||
        type === "DEBIT" ||
        type === "CHARGE"
      ) {
        debitPaise = Math.abs(entry.amountPaise);
      } else if (
        type === "RECEIVE" ||
        type === "PAYMENT" ||
        type === "REFUND" ||
        type === "CREDIT"
      ) {
        creditPaise = Math.abs(entry.amountPaise);
      } else if (
        type === "REFUND_REVERSAL"
      ) {
        debitPaise = Math.abs(entry.amountPaise);
      } else if (
        type === "REVERSAL" ||
        type === "PAYMENT_REVERSAL"
      ) {
        debitPaise = Math.abs(entry.amountPaise);
      } else if (entry.amountPaise < 0) {
        creditPaise = Math.abs(entry.amountPaise);
      } else {
        debitPaise = Math.abs(entry.amountPaise);
      }

      balancePaise += debitPaise;
      balancePaise -= creditPaise;

      return {
        ...serializeEntry(entry),
        debitPaise,
        creditPaise,
        balancePaise,
      };
    });

    const totalDebitPaise = ledger.reduce(
      (sum, item) => sum + item.debitPaise,
      0
    );

    const totalCreditPaise = ledger.reduce(
      (sum, item) => sum + item.creditPaise,
      0
    );

    await writeAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      ...getRequestAuditMeta(request),
      action: "CUSTOMER_LEDGER_VIEW",
      entityType: "Customer",
      entityId: customer.id,
      description:
        `Customer ledger viewed for ${customer.name}.`,
      oldValues: null,
      newValues: {
        customerId: customer.id,
        entryCount: ledger.length,
        totalDebitPaise,
        totalCreditPaise,
        closingBalancePaise: balancePaise,
      },
      referenceType: "Customer",
      referenceId: customer.id,
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        companyName: customer.companyName,
        gstin: customer.gstin,
      },
      ledger,
      summary: {
        entryCount: ledger.length,
        totalDebitPaise,
        totalCreditPaise,
        closingBalancePaise: balancePaise,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load customer ledger.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}