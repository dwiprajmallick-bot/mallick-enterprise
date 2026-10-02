import "server-only";

import {
  createHash,
} from "crypto";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

type AuditDb = {
  auditLog: {
    create: (args: {
      data: {
        actorUserId?: string | null;
        actorRole?: string | null;
        action: string;
        entityType: string;
        entityId?: string | null;
        description?: string | null;
        oldValues?: string | null;
        newValues?: string | null;
        reason?: string | null;
        referenceType?: string | null;
        referenceId?: string | null;
        ipAddress?: string | null;
        userAgent?: string | null;
        sessionId?: string | null;
      };
    }) => Promise<unknown>;
  };

  adminSession: {
    findUnique: (args: {
      where: {
        tokenHash: string;
      };
      select: {
        id: true;
        userId: true;
        expiresAt: true;
        revokedAt: true;
        user: {
          select: {
            id: true;
            role: true;
            active: true;
          };
        };
      };
    }) => Promise<{
      id: string;
      userId: string;
      expiresAt: Date;
      revokedAt: Date | null;
      user: {
        id: string;
        role: string;
        active: boolean;
      };
    } | null>;
  };
};

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "admin_token",
  "adminToken",
  "auth_token",
  "authorization",
  "cookie",
  "sessionToken",
  "otp",
  "secret",
  "apiKey",
  "api_key",
]);

function sanitizeValue(
  value: unknown,
  seen = new WeakSet<object>()
): unknown {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value !== "object") {
    return value;
  }

  if (seen.has(value as object)) {
    return "[Circular]";
  }

  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) =>
      sanitizeValue(item, seen)
    );
  }

  const source =
    value as Record<string, unknown>;

  const result:
    Record<string, unknown> = {};

  for (const [
    key,
    item,
  ] of Object.entries(source)) {

    if (SENSITIVE_KEYS.has(key)) {
      result[key] = "[REDACTED]";
      continue;
    }

    result[key] =
      sanitizeValue(item, seen);
  }

  return result;
}

function serializeAuditValue(
  value: unknown
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  try {
    return JSON.stringify(
      sanitizeValue(value)
    );
  } catch {
    return JSON.stringify({
      serializationError: true,
      valueType: typeof value,
    });
  }
}

export const AUDIT_ACTIONS = {
  CREATE: "CREATE",
  VIEW: "VIEW",
  UPDATE: "UPDATE",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  DELETE_REQUEST: "DELETE_REQUEST",
  DELETE: "DELETE",
  RESTORE: "RESTORE",
  PAYMENT_RECEIVE: "PAYMENT_RECEIVE",
  PAYMENT_PAY: "PAYMENT_PAY",
  PURCHASE: "PURCHASE",
  SALE: "SALE",
  STOCK_IN: "STOCK_IN",
  STOCK_OUT: "STOCK_OUT",
  STOCK_ADJUSTMENT: "STOCK_ADJUSTMENT",
  GST_CREATE: "GST_CREATE",
  GST_UPDATE: "GST_UPDATE",
  LEDGER_CREATE: "LEDGER_CREATE",
  LEDGER_UPDATE: "LEDGER_UPDATE",
  DOCUMENT_UPLOAD: "DOCUMENT_UPLOAD",
  DOCUMENT_CHANGE: "DOCUMENT_CHANGE",
  CORRECTION: "CORRECTION",
  REVERSAL: "REVERSAL",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  EXPORT: "EXPORT",
} as const;

export type AuditAction =
  (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface WriteAuditLogInput {
  actorUserId?: string | null;
  actorRole?: string | null;

  action: AuditAction | string;

  entityType: string;
  entityId?: string | null;

  description?: string | null;

  oldValues?: unknown;
  newValues?: unknown;

  reason?: string | null;

  referenceType?: string | null;
  referenceId?: string | null;

  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;

  db?: AuditDb;
}

function hashSessionToken(
  token: string
) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

async function resolveAdminActor(
  db: AuditDb
) {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        "officekart_admin_session"
      )?.value;

    if (!token) {
      return null;
    }

    const tokenHash =
      hashSessionToken(token);

    const session =
      await db.adminSession.findUnique({
        where: {
          tokenHash,
        },
        select: {
          id: true,
          userId: true,
          expiresAt: true,
          revokedAt: true,
          user: {
            select: {
              id: true,
              role: true,
              active: true,
            },
          },
        },
      });

    if (!session) {
      return null;
    }

    if (session.revokedAt) {
      return null;
    }

    if (
      session.expiresAt.getTime() <=
      Date.now()
    ) {
      return null;
    }

    if (!session.user.active) {
      return null;
    }

    if (session.user.role !== "ADMIN") {
      return null;
    }

    return {
      actorUserId:
        session.user.id,

      actorRole:
        session.user.role,

      sessionId:
        session.id,
    };
  } catch {
    return null;
  }
}

export async function writeAuditLog({
  actorUserId = null,
  actorRole = null,
  action,
  entityType,
  entityId = null,
  description = null,
  oldValues,
  newValues,
  reason = null,
  referenceType = null,
  referenceId = null,
  ipAddress = null,
  userAgent = null,
  sessionId = null,
  db = prisma,
}: WriteAuditLogInput) {

  /*
   * Automatically resolve the logged-in Admin
   * only when the caller identifies the action
   * as an ADMIN action and actorUserId is absent.
   *
   * Customer/public audit events are untouched.
   */
  if (
    actorRole === "ADMIN" &&
    !actorUserId
  ) {
    const actor =
      await resolveAdminActor(db);

    if (actor) {
      actorUserId =
        actor.actorUserId;

      actorRole =
        actor.actorRole;

      if (!sessionId) {
        sessionId =
          actor.sessionId;
      }
    }
  }

  return db.auditLog.create({
    data: {
      actorUserId,
      actorRole,
      action,
      entityType,
      entityId,
      description,

      oldValues:
        serializeAuditValue(
          oldValues
        ),

      newValues:
        serializeAuditValue(
          newValues
        ),

      reason,
      referenceType,
      referenceId,
      ipAddress,
      userAgent,
      sessionId,
    },
  });
}

export function getRequestAuditMeta(
  request: Request
) {
  const forwardedFor =
    request.headers.get(
      "x-forwarded-for"
    );

  const ipAddress =
    forwardedFor
      ?.split(",")[0]
      ?.trim() ||
    request.headers.get(
      "x-real-ip"
    ) ||
    null;

  const userAgent =
    request.headers.get(
      "user-agent"
    );

  return {
    ipAddress,
    userAgent,
  };
}