import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

import { requireCurrentAdminUser } from "@/lib/admin-auth";
async function checkAdmin() {
  const user =
    await requireCurrentAdminUser();

  return Boolean(user);
}

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
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
    const { searchParams } = new URL(request.url);

    const page = positiveInt(
      searchParams.get("page"),
      1
    );

    const pageSize = Math.min(
      positiveInt(
        searchParams.get("pageSize"),
        50
      ),
      100
    );

    const action =
      searchParams.get("action")?.trim() || "";

    const entityType =
      searchParams.get("entityType")?.trim() || "";

    const entityId =
      searchParams.get("entityId")?.trim() || "";

    const actorRole =
      searchParams.get("actorRole")?.trim() || "";

    const actorUserId =
      searchParams.get("actorUserId")?.trim() || "";

    const search =
      searchParams.get("search")?.trim() || "";

    const from =
      searchParams.get("from")?.trim() || "";

    const to =
      searchParams.get("to")?.trim() || "";

    const where: {
      action?: string;
      entityType?: string;
      entityId?: string;
      actorRole?: string;
      actorUserId?: string;
      OR?: Array<{
        description?: {
          contains: string;
        };
        referenceId?: {
          contains: string;
        };
      }>;
      createdAt?: {
        gte?: Date;
        lt?: Date;
      };
    } = {};

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    if (actorRole) {
      where.actorRole = actorRole;
    }

    if (actorUserId) {
      where.actorUserId = actorUserId;
    }

    if (search) {
      where.OR = [
        {
          description: {
            contains: search,
          },
        },
        {
          referenceId: {
            contains: search,
          },
        },
      ];
    }

    if (from || to) {
      where.createdAt = {};

      if (from) {
        const fromDate = new Date(`${from}T00:00:00`);

        if (!Number.isNaN(fromDate.getTime())) {
          where.createdAt.gte = fromDate;
        }
      }

      if (to) {
        const toDate = new Date(`${to}T00:00:00`);
        toDate.setDate(toDate.getDate() + 1);

        if (!Number.isNaN(toDate.getTime())) {
          where.createdAt.lt = toDate;
        }
      }
    }

    const skip =
      (page - 1) * pageSize;

    const [logs, total] =
      await prisma.$transaction([
        prisma.auditLog.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: pageSize,
          select: {
            id: true,
            actorUserId: true,
            actorRole: true,
            action: true,
            entityType: true,
            entityId: true,
            description: true,
            oldValues: true,
            newValues: true,
            reason: true,
            referenceType: true,
            referenceId: true,
            ipAddress: true,
            userAgent: true,
            sessionId: true,
            createdAt: true,

            actor: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
              },
            },
          },
        }),

        prisma.auditLog.count({
          where,
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages:
          Math.ceil(total / pageSize),
      },
      filters: {
        action: action || null,
        entityType: entityType || null,
        entityId: entityId || null,
        actorRole: actorRole || null,
        actorUserId: actorUserId || null,
        search: search || null,
        from: from || null,
        to: to || null,
      },
    });
  } catch (error) {
    console.error(
      "ADMIN AUDIT LOGS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load audit logs.",
      },
      { status: 500 }
    );
  }
}
