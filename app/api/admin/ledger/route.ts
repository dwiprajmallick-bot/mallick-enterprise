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

function makeNumber(
  prefix: string
) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

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

  const url =
    new URL(request.url);

  const accountType =
    url.searchParams.get(
      "accountType"
    ) || "";

  const accountId =
    url.searchParams.get(
      "accountId"
    ) || "";

  const entries =
    await prisma.ledgerEntry.findMany({
      where: {
        ...(accountType
          ? { accountType }
          : {}),
        ...(accountId
          ? { accountId }
          : {}),
      },
      orderBy: {
        transactionAt:
          "desc",
      },
    });

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
      "LedgerEntry",
    description:
      "Admin viewed ledger.",
    newValues: {
      count:
        entries.length,
      accountType,
      accountId,
    },
  });

  return NextResponse.json({
    success: true,
    entries,
  });
}

export async function POST(
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

  try {
    const body =
      await request.json();

    const entryType =
      String(
        body.entryType || ""
      )
        .trim()
        .toUpperCase();

    const accountType =
      String(
        body.accountType || ""
      )
        .trim()
        .toUpperCase();

    const amountPaise =
      Number(
        body.amountPaise
      );

    const description =
      String(
        body.description || ""
      ).trim();

    const reason =
      String(
        body.reason || ""
      ).trim();

    if (
      !["DEBIT", "CREDIT"].includes(
        entryType
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "entryType must be DEBIT or CREDIT.",
        },
        { status: 400 }
      );
    }

    if (!accountType) {
      return NextResponse.json(
        {
          success: false,
          message:
            "accountType is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(
        amountPaise
      ) ||
      amountPaise <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "amountPaise must be a positive integer.",
        },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        {
          success: false,
          message:
            "description is required.",
        },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          message:
            "reason is required for manual ledger entry.",
        },
        { status: 400 }
      );
    }

    const entry =
      await prisma.$transaction(
        async (tx) => {

          const created =
            await tx.ledgerEntry.create({
              data: {
                ledgerNumber:
                  makeNumber(
                    "LED"
                  ),
                entryType,
                accountType,
                accountId:
                  body.accountId
                    ? String(
                        body.accountId
                      )
                    : null,
                orderId:
                  body.orderId
                    ? String(
                        body.orderId
                      )
                    : null,
                purchaseId:
                  body.purchaseId
                    ? String(
                        body.purchaseId
                      )
                    : null,
                paymentId:
                  body.paymentId
                    ? String(
                        body.paymentId
                      )
                    : null,
                amountPaise,
                description,
                referenceType:
                  body.referenceType
                    ? String(
                        body.referenceType
                      )
                    : null,
                referenceId:
                  body.referenceId
                    ? String(
                        body.referenceId
                      )
                    : null,
              },
            });

          await writeAuditLog({
            db: tx,
            actorUserId:
              user.id,
            actorRole:
              user.role,
            ...getRequestAuditMeta(
              request
            ),
            action:
              AUDIT_ACTIONS.LEDGER_CREATE,
            entityType:
              "LedgerEntry",
            entityId:
              created.id,
            description:
              "Manual ledger entry created.",
            newValues:
              created,
            reason,
            referenceType:
              created.referenceType ||
              null,
            referenceId:
              created.referenceId ||
              null,
          });

          return created;
        }
      );

    return NextResponse.json({
      success: true,
      entry,
    });
  } catch (error) {

    console.error(
      "Ledger create error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Ledger entry creation failed.",
      },
      { status: 500 }
    );
  }
}