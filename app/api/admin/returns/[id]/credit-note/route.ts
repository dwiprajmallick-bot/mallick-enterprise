import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireCurrentAdminUser,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

function moneyToPaise(value: number) {
  return Math.round(value * 100);
}

function makeNumber(prefix: string) {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(100000 + Math.random() * 900000);

  return `${prefix}-${y}${m}${d}-${random}`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireCurrentAdminUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));

    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : null;

    const notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;

    const result = await prisma.$transaction(async (tx) => {
      const salesReturn = await tx.salesReturn.findUnique({
        where: { id },
      });

      if (!salesReturn) {
        throw new Error("Sales return not found.");
      }

      if (salesReturn.status === "CANCELLED") {
        throw new Error(
          "A cancelled sales return cannot receive a credit note."
        );
      }

      const existing = await tx.creditNote.findFirst({
        where: {
          salesReturnId: salesReturn.id,
          status: {
            not: "CANCELLED",
          },
        },
      });

      if (existing) {
        throw new Error(
          `Credit Note already exists: ${existing.creditNoteNumber}`
        );
      }

      const returnItems = await tx.salesReturnItem.findMany({
        where: {
          returnId: salesReturn.id,
        },
      });

      if (returnItems.length === 0) {
        throw new Error(
          "Sales return has no items. Credit Note cannot be created."
        );
      }

      const order = await tx.order.findUnique({
        where: {
          id: salesReturn.orderId,
        },
        select: {
          id: true,
          orderNumber: true,
        },
      });

      if (!order) {
        throw new Error("Original order not found.");
      }

      const taxableAmountPaise = moneyToPaise(
        salesReturn.subtotal
      );

      const totalGstPaise = moneyToPaise(
        salesReturn.gstAmount
      );

      const totalAmountPaise = moneyToPaise(
        salesReturn.totalAmount
      );

      /*
       * The current SalesReturn schema stores one combined GST amount
       * rather than CGST/SGST/IGST separately.
       *
       * Therefore we preserve the exact GST total here instead of
       * inventing a tax split.
       */
      const cgstPaise = 0;
      const sgstPaise = 0;
      const igstPaise = totalGstPaise;
      const cessPaise = 0;

      const creditNote = await tx.creditNote.create({
        data: {
          creditNoteNumber: makeNumber("CN"),
          salesReturnId: salesReturn.id,
          orderId: salesReturn.orderId,
          customerId: salesReturn.customerId,
          status: "ISSUED",
          taxableAmountPaise,
          cgstPaise,
          sgstPaise,
          igstPaise,
          cessPaise,
          totalGstPaise,
          totalAmountPaise,
          reason:
            reason ||
            salesReturn.reason ||
            "Sales return",
          notes,
        },
      });

      for (const item of returnItems) {
        const taxableItemPaise = moneyToPaise(
          item.unitPrice * item.quantity
        );

        const gstItemPaise = moneyToPaise(
          item.gstAmount
        );

        const totalItemPaise = moneyToPaise(
          item.totalAmount
        );

        await tx.creditNoteItem.create({
          data: {
            creditNoteId: creditNote.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPricePaise: moneyToPaise(
              item.unitPrice
            ),
            taxableAmountPaise: taxableItemPaise,
            gstRate: item.gstRate,
            cgstPaise: 0,
            sgstPaise: 0,
            igstPaise: gstItemPaise,
            cessPaise: 0,
            totalGstPaise: gstItemPaise,
            totalAmountPaise: totalItemPaise,
          },
        });
      }

      /*
       * GstRecord uses sourceType/sourceId rather than a direct
       * foreign-key relation, so the Credit Note is linked through
       * sourceType = CreditNote and sourceId = creditNote.id.
       */
      const gstRecord = await tx.gstRecord.create({
        data: {
          gstNumber: makeNumber("GST"),
          entryType: "CREDIT_NOTE",
          sourceType: "CreditNote",
          sourceId: creditNote.id,
          gstRate: 0,
          taxablePaise: taxableAmountPaise,
          gstPaise: totalGstPaise,
          status: "ACTIVE",
          notes:
            `GST reversal for Sales Return ${salesReturn.returnNumber}; ` +
            `Original Order ${order.orderNumber}`,
        },
      });

      await writeAuditLog({
        db: tx,
        actorUserId: user.id,
        actorRole: user.role,
        ...getRequestAuditMeta(request),
        action: "CREDIT_NOTE_CREATE",
        entityType: "CreditNote",
        entityId: creditNote.id,
        description:
          `Credit Note ${creditNote.creditNoteNumber} created for ` +
          `Sales Return ${salesReturn.returnNumber}.`,
        oldValues: null,
        newValues: {
          creditNoteNumber: creditNote.creditNoteNumber,
          salesReturnId: salesReturn.id,
          orderId: salesReturn.orderId,
          customerId: salesReturn.customerId,
          taxableAmountPaise,
          totalGstPaise,
          totalAmountPaise,
          gstRecordId: gstRecord.id,
        },
        reason:
          reason ||
          salesReturn.reason ||
          "Sales return credit note",
        referenceType: "SalesReturn",
        referenceId: salesReturn.id,
      });

      await writeAuditLog({
        db: tx,
        actorUserId: user.id,
        actorRole: user.role,
        ...getRequestAuditMeta(request),
        action: "GST_CREDIT_NOTE_CREATE",
        entityType: "GstRecord",
        entityId: gstRecord.id,
        description:
          `GST credit note recorded for ${creditNote.creditNoteNumber}.`,
        oldValues: null,
        newValues: {
          gstNumber: gstRecord.gstNumber,
          taxablePaise: gstRecord.taxablePaise,
          gstPaise: gstRecord.gstPaise,
          sourceType: gstRecord.sourceType,
          sourceId: gstRecord.sourceId,
        },
        reason:
          reason ||
          salesReturn.reason ||
          "Sales return GST reversal",
        referenceType: "CreditNote",
        referenceId: creditNote.id,
      });

      return {
        creditNote,
        gstRecord,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Credit Note created successfully.",
      creditNote: result.creditNote,
      gstRecord: result.gstRecord,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create Credit Note.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireCurrentAdminUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  try {
    const salesReturn = await prisma.salesReturn.findUnique({
      where: { id },
      select: {
        id: true,
        returnNumber: true,
        orderId: true,
        customerId: true,
        reason: true,
        status: true,
        subtotal: true,
        gstAmount: true,
        totalAmount: true,
        refundStatus: true,
        refundAmount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!salesReturn) {
      return NextResponse.json(
        {
          success: false,
          error: "Sales return not found.",
        },
        { status: 404 }
      );
    }

    const creditNote = await prisma.creditNote.findFirst({
      where: {
        salesReturnId: salesReturn.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!creditNote) {
      return NextResponse.json({
        success: true,
        exists: false,
        creditNote: null,
        salesReturn,
      });
    }

    const items = await prisma.creditNoteItem.findMany({
      where: {
        creditNoteId: creditNote.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const productIds = [
      ...new Set(items.map((item) => item.productId)),
    ];

    const products =
      productIds.length > 0
        ? await prisma.product.findMany({
            where: {
              id: {
                in: productIds,
              },
            },
            select: {
              id: true,
              name: true,
              sku: true,
              category: true,
            },
          })
        : [];

    const productMap = new Map(
      products.map((product) => [
        product.id,
        product,
      ])
    );

    const enrichedItems = items.map((item) => ({
      ...item,
      product:
        productMap.get(item.productId) || null,
    }));

    const order = await prisma.order.findUnique({
      where: {
        id: creditNote.orderId,
      },
      select: {
        id: true,
        orderNumber: true,
        subtotal: true,
        gstAmount: true,
        totalAmount: true,
        paymentStatus: true,
        orderStatus: true,
        createdAt: true,
      },
    });

    const customer = await prisma.customer.findUnique({
      where: {
        id: creditNote.customerId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        companyName: true,
        gstin: true,
      },
    });

    const gstRecords = await prisma.gstRecord.findMany({
      where: {
        sourceType: "CreditNote",
        sourceId: creditNote.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    await writeAuditLog({
      db: prisma,
      actorUserId: user.id,
      actorRole: user.role,
      ...getRequestAuditMeta(request),
      action: "CREDIT_NOTE_VIEW",
      entityType: "CreditNote",
      entityId: creditNote.id,
      description:
        `Credit Note ${creditNote.creditNoteNumber} viewed.`,
      oldValues: null,
      newValues: {
        creditNoteNumber:
          creditNote.creditNoteNumber,
        salesReturnId: creditNote.salesReturnId,
        orderId: creditNote.orderId,
      },
      reason: "Credit Note view",
      referenceType: "SalesReturn",
      referenceId: salesReturn.id,
    });

    return NextResponse.json({
      success: true,
      exists: true,
      creditNote: {
        ...creditNote,
        items: enrichedItems,
        order,
        customer,
        gstRecords,
      },
      salesReturn,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Credit Note.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}