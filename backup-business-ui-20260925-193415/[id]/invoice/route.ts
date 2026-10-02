import { requireCurrentAdminUser } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import {

  AUDIT_ACTIONS,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

async function checkAdmin() {
  const user =
    await requireCurrentAdminUser();

  return Boolean(user);
}

type Context = {
  params: Promise<{ id: string }>;
};

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
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const {
      ipAddress,
      userAgent,
    } = getRequestAuditMeta(request);

    await writeAuditLog({
      actorRole: "ADMIN",
      action: AUDIT_ACTIONS.VIEW,
      entityType: "Order",
      entityId: order.id,
      description:
        "Admin viewed order invoice/details.",
      referenceType: "Invoice",
      referenceId: order.id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      invoice: order,
    });
  } catch (error) {
    console.error(
      "Invoice error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load invoice",
      },
      { status: 500 }
    );
  }
}
