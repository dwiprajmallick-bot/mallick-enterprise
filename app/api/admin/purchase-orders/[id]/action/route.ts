import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireCurrentAdminUser,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

type Action =
  | "APPROVE"
  | "ISSUE"
  | "ACKNOWLEDGE"
  | "PARTIAL_RECEIVE"
  | "RECEIVE"
  | "CLOSE"
  | "CANCEL";

function validTransition(
  status: string,
  action: Action
) {
  const transitions: Record<
    string,
    Action[]
  > = {
    DRAFT: ["APPROVE", "CANCEL"],
    APPROVED: ["ISSUE", "CANCEL"],
    ISSUED: ["ACKNOWLEDGE", "CANCEL"],
    ACKNOWLEDGED: [
      "PARTIAL_RECEIVE",
      "RECEIVE",
      "CANCEL",
    ],
    PARTIALLY_RECEIVED: [
      "PARTIAL_RECEIVE",
      "RECEIVE",
      "CLOSE",
    ],
    RECEIVED: ["CLOSE"],
    CLOSED: [],
    CANCELLED: [],
  };

  return (
    transitions[status] || []
  ).includes(action);
}

function nextStatus(
  action: Action
) {
  switch (action) {
    case "APPROVE":
      return "APPROVED";

    case "ISSUE":
      return "ISSUED";

    case "ACKNOWLEDGE":
      return "ACKNOWLEDGED";

    case "PARTIAL_RECEIVE":
      return "PARTIALLY_RECEIVED";

    case "RECEIVE":
      return "RECEIVED";

    case "CLOSE":
      return "CLOSED";

    case "CANCEL":
      return "CANCELLED";

    default:
      return null;
  }
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const user =
      await requireCurrentAdminUser();

    const { id } =
      await context.params;

    const body =
      await request.json();

    if (
  action === "PARTIAL_RECEIVE" ||
  action === "RECEIVE"
) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Direct receiving is disabled. Create and post a Goods Receipt Note (GRN) instead.",
    },
    { status: 400 }
  );
}
const action =
      typeof body.action === "string"
        ? body.action.trim().toUpperCase() as Action
        : null;

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : "";

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: "Action is required.",
        },
        { status: 400 }
      );
    }

    if (action === "CANCEL" && !reason) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cancellation reason is required.",
        },
        { status: 400 }
      );
    }

    const po =
      await prisma.purchaseOrder.findUnique({
        where: {
          id,
        },
      });

    if (!po) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Purchase order not found.",
        },
        { status: 404 }
      );
    }

    if (
      !validTransition(
        po.status,
        action
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Action ${action} is not allowed when PO status is ${po.status}.`,
        },
        { status: 409 }
      );
    }

    const targetStatus =
      nextStatus(action);

    if (!targetStatus) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action.",
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated =
      await prisma.$transaction(
        async (tx) => {
          const data: Record<
            string,
            unknown
          > = {
            status: targetStatus,
          };

          if (action === "APPROVE") {
            data.approvedAt = now;
          }

          if (action === "ISSUE") {
            data.issuedAt = now;
          }

          if (action === "ACKNOWLEDGE") {
            data.acknowledgedAt = now;
          }

          if (action === "PARTIAL_RECEIVE") {
            data.partiallyReceivedAt = now;
          }

          if (action === "RECEIVE") {
            data.receivedAt = now;
          }

          if (action === "CLOSE") {
            data.closedAt = now;
          }

          if (action === "CANCEL") {
            data.cancelledAt = now;
            data.cancellationReason =
              reason;
          }

          const result =
            await tx.purchaseOrder.update({
              where: {
                id: po.id,
              },
              data,
            });

          const auditAction =
            action === "CANCEL"
              ? "PURCHASE_ORDER_CANCEL"
              : `PURCHASE_ORDER_${action}`;

          await writeAuditLog({
            db: tx,
            actorUserId: user.id,
            actorRole: user.role,
            ...getRequestAuditMeta(request),
            action: auditAction,
            entityType: "PurchaseOrder",
            entityId: po.id,
            description:
              `Purchase order ${po.poNumber} changed from ${po.status} to ${targetStatus}.`,
            oldValues: {
              status:
                po.status,
              approvedAt:
                po.approvedAt,
              issuedAt:
                po.issuedAt,
              acknowledgedAt:
                po.acknowledgedAt,
              partiallyReceivedAt:
                po.partiallyReceivedAt,
              receivedAt:
                po.receivedAt,
              closedAt:
                po.closedAt,
              cancelledAt:
                po.cancelledAt,
            },
            newValues: {
              status:
                targetStatus,
              action,
              reason:
                reason || null,
            },
            reason:
              reason || undefined,
          });

          return result;
        }
      );

    return NextResponse.json({
      success: true,
      purchaseOrder: updated,
    });
  } catch (error) {
    console.error(
      "Purchase order action error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update purchase order.",
      },
      { status: 500 }
    );
  }
}