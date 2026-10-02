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
      select: {
        id: true,
        creditNoteNumber: true,
        salesReturnId: true,
        status: true,
        taxableAmountPaise: true,
        totalGstPaise: true,
        totalAmountPaise: true,
        issuedAt: true,
      },
    });

    const creditNoteMap = new Map(
      creditNotes.map((item) => [
        item.salesReturnId,
        item,
      ])
    );

    const salesReturnIds = creditNotes.map(
      (item) => item.salesReturnId
    );

    /*
     * Sales Returns are connected to an Invoice through
     * CreditNote.invoiceId. Therefore we first resolve the
     * Credit Notes belonging to this Invoice and then load
     * their Sales Returns.
     */
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

    const result = salesReturns.map((salesReturn) => ({
      ...salesReturn,
      creditNote:
        creditNoteMap.get(salesReturn.id) ?? null,
    }));

    await writeAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      ...getRequestAuditMeta(request),
      action: "SALES_RETURN_LIST_VIEW",
      entityType: "Invoice",
      entityId: invoice.id,
      description:
        `Sales Return history viewed for Invoice ${invoice.id}.`,
      oldValues: null,
      newValues: {
        invoiceId: invoice.id,
        salesReturnCount: result.length,
      },
      referenceType: "Invoice",
      referenceId: invoice.id,
    });

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      salesReturns: result,
      count: result.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Invoice Sales Return history.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}