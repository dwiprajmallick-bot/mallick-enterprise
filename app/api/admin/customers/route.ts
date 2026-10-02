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

export async function GET(request: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    const customers =
      await prisma.customer.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

    const {
      ipAddress,
      userAgent,
    } = getRequestAuditMeta(request);

    await writeAuditLog({
      actorRole: "ADMIN",
      action: AUDIT_ACTIONS.VIEW,
      entityType: "Customer",
      description:
        "Admin viewed customer list.",
      newValues: {
        resultCount: customers.length,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error(
      "Get customers error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch customers",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
) {
  if (!(await checkAdmin())) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    const body =
      await request.json();

    const name =
      String(body.name ?? "").trim();

    const phone =
      String(body.phone ?? "").trim();

    const email =
      String(body.email ?? "").trim();

    const companyName =
      String(
        body.companyName ?? ""
      ).trim();

    const gstin =
      String(body.gstin ?? "").trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer name is required",
        },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Phone number is required",
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
            await tx.customer.findFirst({
              where: {
                phone,
              },
            });

          if (existing) {
            throw new Error(
              "CUSTOMER_PHONE_EXISTS"
            );
          }

          const created =
            await tx.customer.create({
              data: {
                name,
                phone,
                email: email || null,
                companyName:
                  companyName || null,
                gstin: gstin || null,
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
            action: AUDIT_ACTIONS.CREATE,
            entityType: "Customer",
            entityId: created.id,
            description:
              "Customer created by admin.",
            newValues: {
              id: created.id,
              name: created.name,
              phone: created.phone,
              email: created.email,
              companyName:
                created.companyName,
              gstin: created.gstin,
            },
            ipAddress,
            userAgent,
          });

          return created;
        }
      );

    return NextResponse.json(
      {
        success: true,
        data: customer,
        message:
          "Customer created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "CUSTOMER_PHONE_EXISTS"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A customer with this phone number already exists.",
        },
        { status: 409 }
      );
    }

    console.error(
      "Create customer error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to create customer",
      },
      { status: 500 }
    );
  }
}
