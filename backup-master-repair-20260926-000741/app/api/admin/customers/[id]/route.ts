import { requireCurrentAdminUser } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import {

  AUDIT_ACTIONS,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function isAdminAuthenticated() {
  const user =
    await requireCurrentAdminUser();

  return Boolean(user);
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    if (!(await isAdminAuthenticated())) {
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

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer ID is required.",
        },
        { status: 400 }
      );
    }

    const customer =
      await prisma.customer.findUnique({
        where: {
          id,
        },
        include: {
          _count: {
            select: {
              orders: true,
            },
          },
          orders: {
            orderBy: {
              createdAt: "desc",
            },
            take: 10,
            include: {
              items: {
                orderBy: {
                  productName: "asc",
                },
                select: {
                  id: true,
                  productId: true,
                  productName: true,
                  quantity: true,
                  unit: true,
                  sellingPrice: true,
                  totalPrice: true,
                },
              },
            },
          },
        },
      });

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer not found.",
        },
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
      entityType: "Customer",
      entityId: customer.id,
      description:
        "Admin viewed customer details.",
      newValues: {
        ordersCount:
          customer._count.orders,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error(
      "ADMIN CUSTOMER GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load customer.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: RouteContext
) {
  try {
    if (!(await isAdminAuthenticated())) {
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

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer ID is required.",
        },
        { status: 400 }
      );
    }

    const body =
      await request.json();

    const name =
      String(body.name || "").trim();

    const phone =
      String(body.phone || "").trim();

    const email =
      body.email === null ||
      body.email === undefined
        ? null
        : String(body.email).trim() ||
          null;

    const companyName =
      body.companyName === null ||
      body.companyName === undefined
        ? null
        : String(
            body.companyName
          ).trim() || null;

    const gstin =
      body.gstin === null ||
      body.gstin === undefined
        ? null
        : String(body.gstin).trim() ||
          null;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer name is required.",
        },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer phone is required.",
        },
        { status: 400 }
      );
    }

    const {
      ipAddress,
      userAgent,
    } = getRequestAuditMeta(request);

    const customer =
      await prisma.$transaction(
        async (tx) => {
          const existing =
            await tx.customer.findUnique({
              where: {
                id,
              },
            });

          if (!existing) {
            throw new Error(
              "CUSTOMER_NOT_FOUND"
            );
          }

          const duplicate =
            await tx.customer.findFirst({
              where: {
                phone,
                NOT: {
                  id,
                },
              },
            });

          if (duplicate) {
            throw new Error(
              "CUSTOMER_PHONE_EXISTS"
            );
          }

          const updated =
            await tx.customer.update({
              where: {
                id,
              },
              data: {
                name,
                phone,
                email,
                companyName,
                gstin,
              },
              include: {
                _count: {
                  select: {
                    orders: true,
                  },
                },
              },
            });

          await writeAuditLog({
            db: tx,
            actorRole: "ADMIN",
            action: AUDIT_ACTIONS.UPDATE,
            entityType: "Customer",
            entityId: updated.id,
            description:
              "Customer updated by admin.",
            oldValues: {
              name: existing.name,
              phone: existing.phone,
              email: existing.email,
              companyName:
                existing.companyName,
              gstin: existing.gstin,
            },
            newValues: {
              name: updated.name,
              phone: updated.phone,
              email: updated.email,
              companyName:
                updated.companyName,
              gstin: updated.gstin,
            },
            ipAddress,
            userAgent,
          });

          return updated;
        }
      );

    return NextResponse.json({
      success: true,
      message:
        "Customer updated successfully.",
      data: customer,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "CUSTOMER_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer not found.",
        },
        { status: 404 }
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "CUSTOMER_PHONE_EXISTS"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Another customer already uses this phone number.",
        },
        { status: 409 }
      );
    }

    console.error(
      "ADMIN CUSTOMER UPDATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to update customer.",
      },
      { status: 500 }
    );
  }
}
