import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireCurrentAdminUser,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireCurrentAdminUser(request);

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : "";

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : "";

    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cancellation reason is required.",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const creditNote =
          await tx.creditNote.findUnique({
            where: {
              id,
            },
          });

        if (!creditNote) {
          throw new Error(
            "Credit Note not found."
          );
        }

        if (
          creditNote.status === "CANCELLED"
        ) {
          throw new Error(
            "Credit Note is already cancelled."
          );
        }

        const existingReversal =
          await tx.gstRecord.findFirst({
            where: {
              sourceType:
                "CreditNoteCancellation",
              sourceId:
                creditNote.id,
            },
          });

        if (existingReversal) {
          throw new Error(
            "GST reversal already exists for this Credit Note."
          );
        }

        const originalGst =
          await tx.gstRecord.findFirst({
            where: {
              sourceType: "CreditNote",
              sourceId: creditNote.id,
              status: "ACTIVE",
            },
            orderBy: {
              createdAt: "desc",
            },
          });

        if (!originalGst) {
          throw new Error(
            "Active GST record for this Credit Note was not found."
          );
        }

        const gstNumber =
          `GST-REV-${new Date()
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, "")}-${Math.floor(
            100000 + Math.random() * 900000
          )}`;

        const reversalGst =
          await tx.gstRecord.create({
            data: {
              gstNumber,
              entryType:
                "CREDIT_NOTE_CANCELLATION",
              sourceType:
                "CreditNoteCancellation",
              sourceId: creditNote.id,
              gstRate:
                originalGst.gstRate,
              taxablePaise:
                -Math.abs(
                  originalGst.taxablePaise
                ),
              gstPaise:
                -Math.abs(
                  originalGst.gstPaise
                ),
              status: "ACTIVE",
              notes:
                `GST reversal for cancelled Credit Note ${creditNote.creditNoteNumber}. ${notes}`.trim(),
            },
          });

        const updatedCreditNote =
          await tx.creditNote.update({
            where: {
              id: creditNote.id,
            },
            data: {
              status: "CANCELLED",
              notes:
                [
                  creditNote.notes || "",
                  `CANCELLED: ${reason}`,
                  notes,
                ]
                  .filter(Boolean)
                  .join(" | "),
            },
          });

        await writeAuditLog({
          db: tx,
          actorUserId: user.id,
          actorRole: user.role,
          ...getRequestAuditMeta(request),
          action: "CREDIT_NOTE_CANCEL",
          entityType: "CreditNote",
          entityId: creditNote.id,
          description:
            `Credit Note ${creditNote.creditNoteNumber} cancelled.`,
          oldValues: {
            status: creditNote.status,
            taxableAmountPaise:
              creditNote.taxableAmountPaise,
            totalGstPaise:
              creditNote.totalGstPaise,
            totalAmountPaise:
              creditNote.totalAmountPaise,
          },
          newValues: {
            status:
              updatedCreditNote.status,
            taxableAmountPaise:
              updatedCreditNote.taxableAmountPaise,
            totalGstPaise:
              updatedCreditNote.totalGstPaise,
            totalAmountPaise:
              updatedCreditNote.totalAmountPaise,
          },
          reason,
          referenceType: "CreditNote",
          referenceId: creditNote.id,
        });

        await writeAuditLog({
          db: tx,
          actorUserId: user.id,
          actorRole: user.role,
          ...getRequestAuditMeta(request),
          action: "GST_CREDIT_NOTE_REVERSAL",
          entityType: "GstRecord",
          entityId: reversalGst.id,
          description:
            `GST reversal created for cancelled Credit Note ${creditNote.creditNoteNumber}.`,
          oldValues: {
            gstNumber:
              originalGst.gstNumber,
            taxablePaise:
              originalGst.taxablePaise,
            gstPaise:
              originalGst.gstPaise,
            status:
              originalGst.status,
          },
          newValues: {
            gstNumber:
              reversalGst.gstNumber,
            taxablePaise:
              reversalGst.taxablePaise,
            gstPaise:
              reversalGst.gstPaise,
            status:
              reversalGst.status,
          },
          reason,
          referenceType: "CreditNote",
          referenceId: creditNote.id,
        });

        return {
          creditNote: updatedCreditNote,
          reversalGst,
        };
      }
    );

    return NextResponse.json({
      success: true,
      creditNote: result.creditNote,
      reversalGst: result.reversalGst,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to cancel Credit Note.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }
}