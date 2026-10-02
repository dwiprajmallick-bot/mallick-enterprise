import { NextResponse } from "next/server";
import {
  requireCurrentAdminUser,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCurrentAdminUser(request);
    const { id } = await context.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice not found.",
        },
        { status: 404 }
      );
    }

    const creditNotes = await prisma.creditNote.findMany({
      where: {
        invoiceId: invoice.id,
      },
      orderBy: {
        issuedAt: "desc",
      },
    });

    const creditNoteIds = creditNotes.map(
      (item) => item.id
    );

    const salesReturnIds = creditNotes.map(
      (item) => item.salesReturnId
    );

    const salesReturns =
      salesReturnIds.length > 0
        ? await prisma.salesReturn.findMany({
            where: {
              id: {
                in: salesReturnIds,
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          })
        : [];

    const orderIds = Array.from(
      new Set(
        creditNotes
          .map((item) => item.orderId)
          .filter(Boolean)
      )
    );

    const orders =
      orderIds.length > 0
        ? await prisma.order.findMany({
            where: {
              id: {
                in: orderIds,
              },
            },
            select: {
              id: true,
              orderNumber: true,
              customerId: true,
              subtotal: true,
              gstAmount: true,
              totalAmount: true,
              paymentStatus: true,
              orderStatus: true,
              createdAt: true,
            },
          })
        : [];

    const gstRecords =
      creditNoteIds.length > 0
        ? await prisma.gstRecord.findMany({
            where: {
              sourceType: "CreditNote",
              sourceId: {
                in: creditNoteIds,
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          })
        : [];

    const customerIds = Array.from(
      new Set(
        creditNotes
          .map((item) => item.customerId)
          .filter(Boolean)
      )
    );

    const customers =
      customerIds.length > 0
        ? await prisma.customer.findMany({
            where: {
              id: {
                in: customerIds,
              },
            },
            select: {
              id: true,
              name: true,
              companyName: true,
              phone: true,
              email: true,
              gstin: true,
            },
          })
        : [];

    const payments = await prisma.payment.findMany({
      where: {
        type: "REFUND",
        orderId: {
          in:
            orderIds.length > 0
              ? orderIds
              : ["__NO_ORDER__"],
        },
      },
      orderBy: {
        paidAt: "desc",
      },
    });

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        OR: [
          {
            orderId: {
              in:
                orderIds.length > 0
                  ? orderIds
                  : ["__NO_ORDER__"],
            },
          },
          {
            referenceType: "SalesReturn",
            referenceId: {
              in:
                salesReturnIds.length > 0
                  ? salesReturnIds
                  : ["__NO_RETURN__"],
            },
          },
          {
            referenceType: "CreditNote",
            referenceId: {
              in:
                creditNoteIds.length > 0
                  ? creditNoteIds
                  : ["__NO_CREDIT_NOTE__"],
            },
          },
        ],
      },
      orderBy: {
        transactionAt: "desc",
      },
    });

    const salesReturnMap = new Map(
      salesReturns.map((item) => [item.id, item])
    );

    const orderMap = new Map(
      orders.map((item) => [item.id, item])
    );

    const customerMap = new Map(
      customers.map((item) => [item.id, item])
    );

    const gstMap = new Map<string, typeof gstRecords>();

    for (const gst of gstRecords) {
      const existing = gstMap.get(gst.sourceId) || [];
      existing.push(gst);
      gstMap.set(gst.sourceId, existing);
    }

    const traceCreditNotes = creditNotes.map((creditNote) => ({
      ...creditNote,
      salesReturn:
        salesReturnMap.get(
          creditNote.salesReturnId
        ) ?? null,
      order:
        orderMap.get(
          creditNote.orderId
        ) ?? null,
      customer:
        customerMap.get(
          creditNote.customerId
        ) ?? null,
      gstRecords:
        gstMap.get(creditNote.id) ?? [],
    }));

    await writeAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      ...getRequestAuditMeta(request),
      action: "INVOICE_TRANSACTION_TRACE_VIEW",
      entityType: "Invoice",
      entityId: invoice.id,
      description:
        `Complete transaction trace viewed for Invoice ${invoice.id}.`,
      oldValues: null,
      newValues: {
        invoiceId: invoice.id,
        creditNoteCount: creditNotes.length,
        salesReturnCount: salesReturns.length,
        gstRecordCount: gstRecords.length,
        refundPaymentCount: payments.length,
        ledgerEntryCount: ledgerEntries.length,
      },
      referenceType: "Invoice",
      referenceId: invoice.id,
    });

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
      },
      orders,
      salesReturns,
      creditNotes: traceCreditNotes,
      gstRecords,
      payments,
      ledgerEntries,
      customers,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load invoice transaction trace.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}