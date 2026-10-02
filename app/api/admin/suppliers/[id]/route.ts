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

  const { id } =
    await context.params;

  const supplier =
    await prisma.supplier.findUnique({
      where: {
        id,
      },
    });

  if (!supplier) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Supplier not found.",
      },
      { status: 404 }
    );
  }

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
      "Supplier",
    entityId:
      supplier.id,
    description:
      "Admin viewed supplier.",
  });

  return NextResponse.json({
    success: true,
    supplier,
  });
}

export async function PUT(
  request: Request,
  context: Context
) {
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

  const { id } =
    await context.params;

  try {
    const body =
      await request.json();

    const oldSupplier =
      await prisma.supplier.findUnique({
        where: {
          id,
        },
      });

    if (!oldSupplier) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supplier not found.",
        },
        { status: 404 }
      );
    }

    const updated =
      await prisma.$transaction(
        async (tx) => {

          const supplier =
            await tx.supplier.update({
              where: {
                id,
              },
              data: {
                supplierCode:
                  body.supplierCode !==
                  undefined
                    ? String(
                        body.supplierCode
                      ).trim()
                    : oldSupplier.supplierCode,
                name:
                  body.name !==
                  undefined
                    ? String(
                        body.name
                      ).trim()
                    : oldSupplier.name,
                phone:
                  body.phone !==
                  undefined
                    ? String(
                        body.phone
                      ).trim() ||
                      null
                    : oldSupplier.phone,
                email:
                  body.email !==
                  undefined
                    ? String(
                        body.email
                      ).trim() ||
                      null
                    : oldSupplier.email,
                address:
                  body.address !==
                  undefined
                    ? String(
                        body.address
                      ).trim() ||
                      null
                    : oldSupplier.address,
                gstin:
                  body.gstin !==
                  undefined
                    ? String(
                        body.gstin
                      ).trim() ||
                      null
                    : oldSupplier.gstin,
                status:
                  body.status !==
                  undefined
                    ? String(
                        body.status
                      ).trim()
                    : oldSupplier.status,
                notes:
                  body.notes !==
                  undefined
                    ? String(
                        body.notes
                      )
                    : oldSupplier.notes,
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
              AUDIT_ACTIONS.UPDATE,
            entityType:
              "Supplier",
            entityId:
              supplier.id,
            description:
              "Supplier master data updated.",
            oldValues:
              oldSupplier,
            newValues:
              supplier,
            reason:
              body.reason
                ? String(
                    body.reason
                  )
                : "Supplier master data update.",
            referenceType:
              "Supplier",
            referenceId:
              supplier.id,
          });

          return supplier;
        }
      );

    return NextResponse.json({
      success: true,
      supplier:
        updated,
    });
  } catch (error) {
    console.error(
      "Supplier update error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Supplier update failed.",
      },
      { status: 500 }
    );
  }
}