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

export async function GET(request: Request) {
  const user = await requireCurrentAdminUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  const url = new URL(request.url);

  const search =
    url.searchParams.get("search")?.trim() || "";

  const status =
    url.searchParams.get("status")?.trim() || "";

  const suppliers =
    await prisma.supplier.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                  },
                },
                {
                  supplierCode: {
                    contains: search,
                  },
                },
                {
                  phone: {
                    contains: search,
                  },
                },
                {
                  gstin: {
                    contains: search,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  await writeAuditLog({
    actorUserId: user.id,
    actorRole: user.role,
    ...getRequestAuditMeta(request),
    action: AUDIT_ACTIONS.VIEW,
    entityType: "Supplier",
    description: "Admin viewed supplier list.",
    newValues: {
      count: suppliers.length,
      search,
      status,
    },
  });

  return NextResponse.json({
    success: true,
    suppliers,
  });
}

export async function POST(request: Request) {
  const user = await requireCurrentAdminUser();

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
    const body = await request.json();

    const name =
      String(body.name || "").trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supplier name is required.",
        },
        { status: 400 }
      );
    }

    const supplierCode =
      String(
        body.supplierCode || ""
      ).trim() ||
      `SUP-${Date.now()}`;

    const supplier =
      await prisma.$transaction(
        async (tx) => {

          const created =
            await tx.supplier.create({
              data: {
                supplierCode,
                name,
                phone:
                  body.phone
                    ? String(
                        body.phone
                      ).trim()
                    : null,
                email:
                  body.email
                    ? String(
                        body.email
                      ).trim()
                    : null,
                address:
                  body.address
                    ? String(
                        body.address
                      ).trim()
                    : null,
                gstin:
                  body.gstin
                    ? String(
                        body.gstin
                      ).trim()
                    : null,
                status:
                  String(
                    body.status ||
                      "ACTIVE"
                  ).trim(),
                notes:
                  body.notes
                    ? String(
                        body.notes
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
              AUDIT_ACTIONS.CREATE,
            entityType:
              "Supplier",
            entityId:
              created.id,
            description:
              "Supplier created.",
            newValues:
              created,
            referenceType:
              "Supplier",
            referenceId:
              created.id,
          });

          return created;
        }
      );

    return NextResponse.json({
      success: true,
      supplier,
    });
  } catch (error) {
    console.error(
      "Supplier create error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Supplier creation failed.",
      },
      { status: 500 }
    );
  }
}