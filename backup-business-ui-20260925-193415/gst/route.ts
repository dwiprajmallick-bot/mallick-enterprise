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

  const url =
    new URL(request.url);

  const entryType =
    url.searchParams.get(
      "entryType"
    ) || "";

  const sourceType =
    url.searchParams.get(
      "sourceType"
    ) || "";

  const sourceId =
    url.searchParams.get(
      "sourceId"
    ) || "";

  const records =
    await prisma.gstRecord.findMany({
      where: {
        ...(entryType
          ? { entryType }
          : {}),
        ...(sourceType
          ? { sourceType }
          : {}),
        ...(sourceId
          ? { sourceId }
          : {}),
      },
      orderBy: {
        createdAt:
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
      "GstRecord",
    description:
      "Admin viewed GST records.",
    newValues: {
      count:
        records.length,
      entryType,
      sourceType,
      sourceId,
    },
  });

  return NextResponse.json({
    success: true,
    records,
  });
}