import {
  readFile,
} from "node:fs/promises";

import path from "node:path";

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

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: Context
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

  const { id } =
    await context.params;

  const document =
    await prisma.document.findUnique({
      where: {
        id,
      },
    });

  if (!document) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Document not found.",
      },
      { status: 404 }
    );
  }

  const root =
    path.resolve(
      process.cwd(),
      "storage",
      "documents"
    );

  const absolutePath =
    path.resolve(
      process.cwd(),
      document.storagePath
    );

  const relative =
    path.relative(
      root,
      absolutePath
    );

  if (
    relative.startsWith(
      ".."
    ) ||
    path.isAbsolute(
      relative
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Invalid document path.",
      },
      { status: 400 }
    );
  }

  try {
    const buffer =
      await readFile(
        absolutePath
      );

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
        "Document",
      entityId:
        document.id,
      description:
        "Admin downloaded document.",
      newValues: {
        documentNumber:
          document.documentNumber,
        version:
          document.version,
        fileName:
          document.fileName,
      },
      referenceType:
        document.entityType,
      referenceId:
        document.entityId,
    });

    return new NextResponse(
      buffer,
      {
        status: 200,
        headers: {
          "Content-Type":
            document.mimeType ||
            "application/octet-stream",
          "Content-Length":
            String(
              buffer.length
            ),
          "Content-Disposition":
            `attachment; filename="${document.fileName.replace(/"/g, "")}"`,
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch (error) {

    console.error(
      "Document download error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Document file could not be read.",
      },
      { status: 404 }
    );
  }
}