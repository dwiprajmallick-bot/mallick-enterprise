import { NextResponse } from "next/server";
import {
  requireCurrentAdminUser,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";
import { prisma } from "@/lib/prisma";

type AccountBalance = {
  id: string;
  name: string;
  companyName: string | null;
  phone: string | null;
  gstin: string | null;
  debitPaise: number;
  creditPaise: number;
  balancePaise: number;
};

function calculateCustomerBalance(entries: any[]) {
  let debitPaise = 0;
  let creditPaise = 0;

  for (const entry of entries) {
    const type = String(entry.entryType || "").toUpperCase();

    if (
      type === "SALE" ||
      type === "INVOICE" ||
      type === "DEBIT" ||
      type === "CHARGE"
    ) {
      debitPaise += Math.abs(entry.amountPaise);
    } else if (
      type === "RECEIVE" ||
      type === "PAYMENT" ||
      type === "REFUND" ||
      type === "CREDIT"
    ) {
      creditPaise += Math.abs(entry.amountPaise);
    } else if (
      type === "REFUND_REVERSAL" ||
      type === "PAYMENT_REVERSAL" ||
      type === "REVERSAL"
    ) {
      debitPaise += Math.abs(entry.amountPaise);
    } else if (entry.amountPaise < 0) {
      creditPaise += Math.abs(entry.amountPaise);
    } else {
      debitPaise += Math.abs(entry.amountPaise);
    }
  }

  return {
    debitPaise,
    creditPaise,
    balancePaise: debitPaise - creditPaise,
  };
}

function calculateSupplierBalance(entries: any[]) {
  let debitPaise = 0;
  let creditPaise = 0;

  for (const entry of entries) {
    const type = String(entry.entryType || "").toUpperCase();

    if (
      type === "PURCHASE" ||
      type === "BILL" ||
      type === "CREDIT" ||
      type === "CHARGE"
    ) {
      creditPaise += Math.abs(entry.amountPaise);
    } else if (
      type === "PAY" ||
      type === "PAYMENT" ||
      type === "DEBIT"
    ) {
      debitPaise += Math.abs(entry.amountPaise);
    } else if (
      type === "PAYMENT_REVERSAL" ||
      type === "PAY_REVERSAL" ||
      type === "REVERSAL"
    ) {
      creditPaise += Math.abs(entry.amountPaise);
    } else if (entry.amountPaise < 0) {
      debitPaise += Math.abs(entry.amountPaise);
    } else {
      creditPaise += Math.abs(entry.amountPaise);
    }
  }

  return {
    debitPaise,
    creditPaise,
    balancePaise: creditPaise - debitPaise,
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireCurrentAdminUser(request);

    const [customers, suppliers, customerEntries, supplierEntries] =
      await Promise.all([
        prisma.customer.findMany({
          orderBy: {
            name: "asc",
          },
        }),

        prisma.supplier.findMany({
          orderBy: {
            name: "asc",
          },
        }),

        prisma.ledgerEntry.findMany({
          where: {
            accountType: "CUSTOMER",
            accountId: {
              not: null,
            },
          },
          orderBy: {
            transactionAt: "asc",
          },
        }),

        prisma.ledgerEntry.findMany({
          where: {
            accountType: "SUPPLIER",
            accountId: {
              not: null,
            },
          },
          orderBy: {
            transactionAt: "asc",
          },
        }),
      ]);

    const customerEntryMap = new Map<string, any[]>();
    const supplierEntryMap = new Map<string, any[]>();

    for (const entry of customerEntries) {
      if (!entry.accountId) continue;

      const list = customerEntryMap.get(entry.accountId) || [];
      list.push(entry);
      customerEntryMap.set(entry.accountId, list);
    }

    for (const entry of supplierEntries) {
      if (!entry.accountId) continue;

      const list = supplierEntryMap.get(entry.accountId) || [];
      list.push(entry);
      supplierEntryMap.set(entry.accountId, list);
    }

    const customerAccounts: AccountBalance[] = customers.map(
      (customer) => {
        const calculated = calculateCustomerBalance(
          customerEntryMap.get(customer.id) || []
        );

        return {
          id: customer.id,
          name: customer.name,
          companyName: customer.companyName,
          phone: customer.phone,
          gstin: customer.gstin,
          ...calculated,
        };
      }
    );

    const supplierAccounts: AccountBalance[] = suppliers.map(
      (supplier) => {
        const calculated = calculateSupplierBalance(
          supplierEntryMap.get(supplier.id) || []
        );

        return {
          id: supplier.id,
          name: supplier.name,
          companyName: supplier.companyName,
          phone: supplier.phone,
          gstin: supplier.gstin,
          ...calculated,
        };
      }
    );

    const outstandingCustomers = customerAccounts
      .filter((item) => item.balancePaise > 0)
      .sort((a, b) => b.balancePaise - a.balancePaise);

    const outstandingSuppliers = supplierAccounts
      .filter((item) => item.balancePaise > 0)
      .sort((a, b) => b.balancePaise - a.balancePaise);

    const customerReceivablePaise = outstandingCustomers.reduce(
      (sum, item) => sum + item.balancePaise,
      0
    );

    const supplierPayablePaise = outstandingSuppliers.reduce(
      (sum, item) => sum + item.balancePaise,
      0
    );

    const customerDebitPaise = customerAccounts.reduce(
      (sum, item) => sum + item.debitPaise,
      0
    );

    const customerCreditPaise = customerAccounts.reduce(
      (sum, item) => sum + item.creditPaise,
      0
    );

    const supplierDebitPaise = supplierAccounts.reduce(
      (sum, item) => sum + item.debitPaise,
      0
    );

    const supplierCreditPaise = supplierAccounts.reduce(
      (sum, item) => sum + item.creditPaise,
      0
    );

    await writeAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      ...getRequestAuditMeta(request),
      action: "RECEIVABLE_PAYABLE_DASHBOARD_VIEW",
      entityType: "Accounting",
      entityId: "receivable-payable",
      description:
        "Receivable and payable dashboard viewed.",
      oldValues: null,
      newValues: {
        customerCount: customers.length,
        supplierCount: suppliers.length,
        customerReceivablePaise,
        supplierPayablePaise,
        customerLedgerEntries: customerEntries.length,
        supplierLedgerEntries: supplierEntries.length,
      },
      referenceType: "Accounting",
      referenceId: "receivable-payable",
    });

    return NextResponse.json({
      success: true,

      summary: {
        customerCount: customers.length,
        supplierCount: suppliers.length,

        customerLedgerEntries: customerEntries.length,
        supplierLedgerEntries: supplierEntries.length,

        customerDebitPaise,
        customerCreditPaise,
        customerReceivablePaise,

        supplierDebitPaise,
        supplierCreditPaise,
        supplierPayablePaise,

        netWorkingCapitalExposurePaise:
          customerReceivablePaise - supplierPayablePaise,
      },

      customers: outstandingCustomers.slice(0, 50),
      suppliers: outstandingSuppliers.slice(0, 50),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load receivable/payable dashboard.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}