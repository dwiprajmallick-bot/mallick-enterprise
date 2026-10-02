import { requireCurrentAdminUser } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import {

  AUDIT_ACTIONS,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

async function isAdminAuthenticated() {
  const user =
    await requireCurrentAdminUser();

  return Boolean(user);
}

export async function GET(request: Request) {
  try {
    const authenticated =
      await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        paymentStatus: true,
        orderStatus: true,
        paymentMethod: true,
        createdAt: true,

        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            companyName: true,
          },
        },

        _count: {
          select: {
            items: true,
          },
        },
      },
    });

    const { ipAddress, userAgent } =
      getRequestAuditMeta(request);

    await writeAuditLog({
      actorRole: "ADMIN",
      action: AUDIT_ACTIONS.VIEW,
      entityType: "Order",
      description:
        "Admin viewed order list.",
      newValues: {
        resultCount: orders.length,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error(
      "ADMIN ORDERS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load orders.",
      },
      { status: 500 }
    );
  }
}
