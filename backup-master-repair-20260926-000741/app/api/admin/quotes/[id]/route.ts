import { requireCurrentAdminUser } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {

  AUDIT_ACTIONS,
  getRequestAuditMeta,
  writeAuditLog,
  type AuditAction,
} from "@/lib/audit";

async function checkAdmin() {
  const user =
    await requireCurrentAdminUser();

  return Boolean(user);
}

type Context = {
  params: Promise<{ id: string }>;
};

const STATUSES = [
  "NEW",
  "CONTACTED",
  "QUOTED",
  "APPROVED",
  "REJECTED",
  "CLOSED",
];

export async function GET(
  request: Request,
  { params }: Context
) {
  if (!(await checkAdmin())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const quote = await prisma.quoteRequest.findUnique({
      where: { id },
    });

    if (!quote) {
      return NextResponse.json(
        { error: "Quote request not found" },
        { status: 404 }
      );
    }

    const meta = getRequestAuditMeta(request);

    await writeAuditLog({
      ...meta,
      actorRole: "ADMIN",
      action: AUDIT_ACTIONS.VIEW,
      entityType: "QuoteRequest",
      entityId: quote.id,
      description: "Viewed quote request details.",
      referenceType: "QuoteRequest",
      referenceId: quote.id,
    });

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Get quote error:", error);

    return NextResponse.json(
      { error: "Failed to fetch quote request" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: Context
) {
  if (!(await checkAdmin())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();

    const status = String(body.status ?? "")
      .trim()
      .toUpperCase();

    const reason = String(
      body.reason ??
      body.decisionReason ??
      ""
    ).trim();

    if (!STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Allowed: ${STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const existing = await prisma.quoteRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Quote request not found" },
        { status: 404 }
      );
    }

    const isApproval = status === "APPROVED";
    const isRejection = status === "REJECTED";

    if ((isApproval || isRejection) && !reason) {
      return NextResponse.json(
        {
          error:
            isApproval
              ? "Approval reason is required."
              : "Rejection reason is required.",
        },
        { status: 400 }
      );
    }

    let auditAction: AuditAction = AUDIT_ACTIONS.UPDATE;

    if (isApproval) {
      auditAction = AUDIT_ACTIONS.APPROVE;
    } else if (isRejection) {
      auditAction = AUDIT_ACTIONS.REJECT;
    }

    const meta = getRequestAuditMeta(request);

    const quote = await prisma.$transaction(async (tx) => {

      const updatedQuote = await tx.quoteRequest.update({
        where: { id },
        data: {
          status,
          ...(isApproval || isRejection
            ? {
                decisionReason: reason,
              }
            : {}),
        },
      });

      await writeAuditLog({
        ...meta,
        db: tx,
        actorRole: "ADMIN",
        action: auditAction,
        entityType: "QuoteRequest",
        entityId: updatedQuote.id,
        description:
          isApproval
            ? "Quote request approved."
            : isRejection
              ? "Quote request rejected."
              : "Quote request status updated.",
        oldValues: {
          status: existing.status,
          decisionReason: existing.decisionReason,
        },
        newValues: {
          status: updatedQuote.status,
          decisionReason: updatedQuote.decisionReason,
        },
        reason: reason || null,
        referenceType: "QuoteRequest",
        referenceId: updatedQuote.id,
      });

      return updatedQuote;
    });

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Update quote error:", error);

    return NextResponse.json(
      { error: "Failed to update quote request" },
      { status: 500 }
    );
  }
}