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

  const [
    suppliers,
    purchases,
    invoices,
    payments,
    ledger,
    gst,
    documents,
    orders,
    products,
  ] = await Promise.all([
    prisma.supplier.count(),
    prisma.purchase.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.ledgerEntry.count(),
    prisma.gstRecord.count(),
    prisma.document.count(),
    prisma.order.count(),
    prisma.product.count(),
  ]);

  const stock =
    await prisma.product.aggregate({
      _sum: {
        stock:
          true,
      },
    });

  const purchaseValue =
    await prisma.purchase.aggregate({
      _sum: {
        totalPaise:
          true,
      },
    });

  const invoiceValue =
    await prisma.invoice.aggregate({
      _sum: {
        totalPaise:
          true,
      },
    });

  const received =
    await prisma.payment.aggregate({
      where: {
        type:
          "RECEIVE",
        status:
          "SUCCESS",
      },
      _sum: {
        amountPaise:
          true,
      },
    });

  const paid =
    await prisma.payment.aggregate({
      where: {
        type:
          "PAY",
        status:
          "SUCCESS",
      },
      _sum: {
        amountPaise:
          true,
      },
    });

  const snapshot = {
    suppliers,
    purchases,
    invoices,
    payments,
    ledger,
    gst,
    documents,
    orders,
    products,
    totalStock:
      stock._sum.stock || 0,
    purchaseValuePaise:
      purchaseValue._sum.totalPaise ||
      0,
    invoiceValuePaise:
      invoiceValue._sum.totalPaise ||
      0,
    receivedPaymentPaise:
      received._sum.amountPaise ||
      0,
    paidPaymentPaise:
      paid._sum.amountPaise ||
      0,
  };

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
      "BusinessSummary",
    description:
      "Admin viewed business summary.",
    newValues:
      snapshot,
  });

  return NextResponse.json({
    success: true,
    summary:
      snapshot,
  });
}