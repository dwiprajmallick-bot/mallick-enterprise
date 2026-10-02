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
      where: {
        id,
      },
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
        invoiceId: id,
      },
      orderBy: {
        issuedAt: "desc",
      },
    });

    const salesReturnIds = creditNotes.map(
      (creditNote) => creditNote.salesReturnId
    );

    const salesReturns =
      salesReturnIds.length > 0
        ? await prisma.salesReturn.findMany({
            where: {
              id: {
                in: salesReturnIds,
              },
            },
            select: {
              id: true,
              returnNumber: true,
              status: true,
              reason: true,
              totalAmount: true,
              refundStatus: true,
              refundAmount: true,
              createdAt: true,
            },
          })
        : [];

    const salesReturnMap = new Map(
      salesReturns.map((item) => [item.id, item])
    );

    const result = creditNotes.map((creditNote) => ({
      ...creditNote,
      salesReturn:
        salesReturnMap.get(creditNote.salesReturnId) ?? null,
    }));

    await writeAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      ...getRequestAuditMeta(request),
      action: "CREDIT_NOTE_LIST_VIEW",
      entityType: "Invoice",
      entityId: invoice.id,
      description:
        `Credit Note history viewed for Invoice ${invoice.id}.`,
      oldValues: null,
      newValues: {
        invoiceId: invoice.id,
        creditNoteCount: result.length,
      },
      referenceType: "Invoice",
      referenceId: invoice.id,
    });

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      creditNotes: result,
      count: result.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Invoice Credit Note history.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}