import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  mkdir,
  writeFile,
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

function makeNumber(
  prefix: string
) {
  return `${prefix}-${Date.now()}-${randomBytes(5)
    .toString("hex")
    .toUpperCase()}`;
}

function safeFileName(
  name: string
) {
  return name
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )
    .slice(0, 150);
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

  const entityType =
    url.searchParams.get(
      "entityType"
    ) || "";

  const entityId =
    url.searchParams.get(
      "entityId"
    ) || "";

  const documents =
    await prisma.document.findMany({
      where: {
        ...(entityType
          ? { entityType }
          : {}),
        ...(entityId
          ? { entityId }
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
      "Document",
    description:
      "Admin viewed documents.",
    newValues: {
      count:
        documents.length,
      entityType,
      entityId,
    },
  });

  return NextResponse.json({
    success: true,
    documents,
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
    const formData =
      await request.formData();

    const entityType =
      String(
        formData.get(
          "entityType"
        ) || ""
      ).trim();

    const entityId =
      String(
        formData.get(
          "entityId"
        ) || ""
      ).trim();

    const documentType =
      String(
        formData.get(
          "documentType"
        ) || ""
      ).trim();

    const notes =
      String(
        formData.get(
          "notes"
        ) || ""
      ).trim();

    const file =
      formData.get("file");

    if (
      !entityType ||
      !entityId ||
      !documentType
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "entityType, entityId and documentType are required.",
        },
        { status: 400 }
      );
    }

    if (
      !(file instanceof File)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A file is required.",
        },
        { status: 400 }
      );
    }

    const maxSize =
      5 * 1024 * 1024;

    if (
      file.size <= 0 ||
      file.size > maxSize
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "File size must be 1 byte to 5 MB.",
        },
        { status: 400 }
      );
    }

    const originalName =
      safeFileName(
        file.name
      );

    const extension =
      path.extname(
        originalName
      );

    const storageName =
      `${Date.now()}-${randomBytes(10).toString("hex")}${extension}`;

    const storageDir =
      path.join(
        process.cwd(),
        "storage",
        "documents"
      );

    const absolutePath =
      path.join(
        storageDir,
        storageName
      );

    await mkdir(
      storageDir,
      {
        recursive:
          true,
      }
    );

    const buffer =
      Buffer.from(
        await file.arrayBuffer()
      );

    const checksum =
      createHash("sha256")
        .update(buffer)
        .digest("hex");

    await writeFile(
      absolutePath,
      buffer
    );

    const document =
      await prisma.$transaction(
        async (tx) => {

          const latest =
            await tx.document.findFirst({
              where: {
                entityType,
                entityId,
                documentType,
              },
              orderBy: {
                version:
                  "desc",
              },
            });

          const version =
            (latest?.version ||
              0) + 1;

          const created =
            await tx.document.create({
              data: {
                documentNumber:
                  makeNumber(
                    "DOC"
                  ),
                entityType,
                entityId,
                documentType,
                fileName:
                  originalName,
                storagePath:
                  path.join(
                    "storage",
                    "documents",
                    storageName
                  ),
                mimeType:
                  file.type ||
                  null,
                fileSize:
                  file.size,
                checksum,
                version,
                status:
                  "ACTIVE",
                notes:
                  notes ||
                  null,
                uploadedByUserId:
                  user.id,
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
              latest
                ? AUDIT_ACTIONS.DOCUMENT_CHANGE
                : AUDIT_ACTIONS.DOCUMENT_UPLOAD,
            entityType:
              "Document",
            entityId:
              created.id,
            description:
              latest
                ? "New document version uploaded."
                : "Document uploaded.",
            oldValues:
              latest
                ? {
                    id:
                      latest.id,
                    version:
                      latest.version,
                    fileName:
                      latest.fileName,
                    checksum:
                      latest.checksum,
                  }
                : null,
            newValues: {
              id:
                created.id,
              version:
                created.version,
              fileName:
                created.fileName,
              mimeType:
                created.mimeType,
              fileSize:
                created.fileSize,
              checksum:
                created.checksum,
            },
            referenceType:
              entityType,
            referenceId:
              entityId,
          });

          return created;
        }
      );

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {

    console.error(
      "Document upload error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Document upload failed.",
      },
      { status: 500 }
    );
  }
}