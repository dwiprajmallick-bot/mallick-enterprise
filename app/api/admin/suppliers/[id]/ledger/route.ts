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

    const supplier = await prisma.supplier.findUnique({
      where: { id },
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

    const entries = await prisma.ledgerEntry.findMany({
      where: {
        accountType: "SUPPLIER",
        accountId: supplier.id,
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
      const type = String(entry.entryType || "").toUpperCase();

      let debitPaise = 0;
      let creditPaise = 0;

      /*
       * Supplier account:
       *
       * CREDIT = payable created / amount owed to supplier
       * DEBIT  = payment made / reduction of payable
       *
       * LedgerEntry itself remains immutable.
       */

      if (
        type === "PURCHASE" ||
        type === "BILL" ||
        type === "CREDIT" ||
        type === "CHARGE"
      ) {
        creditPaise = Math.abs(entry.amountPaise);
      } else if (
        type === "PAY" ||
        type === "PAYMENT" ||
        type === "DEBIT"
      ) {
        debitPaise = Math.abs(entry.amountPaise);
      } else if (
        type === "PAYMENT_REVERSAL" ||
        type === "PAY_REVERSAL" ||
        type === "REVERSAL"
      ) {
        creditPaise = Math.abs(entry.amountPaise);
      } else if (entry.amountPaise < 0) {
        debitPaise = Math.abs(entry.amountPaise);
      } else {
        creditPaise = Math.abs(entry.amountPaise);
      }

      balancePaise += creditPaise;
      balancePaise -= debitPaise;

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
      action: "SUPPLIER_LEDGER_VIEW",
      entityType: "Supplier",
      entityId: supplier.id,
      description:
        `Supplier ledger viewed for ${supplier.name}.`,
      oldValues: null,
      newValues: {
        supplierId: supplier.id,
        entryCount: ledger.length,
        totalDebitPaise,
        totalCreditPaise,
        closingBalancePaise: balancePaise,
      },
      referenceType: "Supplier",
      referenceId: supplier.id,
    });

    return NextResponse.json({
      success: true,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email,
        companyName: supplier.companyName,
        gstin: supplier.gstin,
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
        : "Failed to load supplier ledger.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}