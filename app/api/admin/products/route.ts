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

  try {
    const products =
      await prisma.product.findMany({
        where: {
          active: true,
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          sellingPrice: true,
          stock: true,
          unit: true,
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
        "Product",
      description:
        "Admin viewed active products.",
      newValues: {
        count:
          products.length,
      },
    });

    const data =
      products.map(
        (product) => ({
          id:
            product.id,
          name:
            product.name,
          price:
            product.sellingPrice,
          sellingPrice:
            product.sellingPrice,
          stock:
            product.stock,
          unit:
            product.unit,
        })
      );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "ADMIN PRODUCTS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load products.",
      },
      { status: 500 }
    );
  }
}
