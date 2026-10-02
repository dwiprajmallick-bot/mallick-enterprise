import "server-only";

import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

const SESSION_COOKIE = "officekart_admin_session";

const SESSION_TTL_SECONDS = 60 * 60 * 24;

function hashSessionToken(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");

  const derivedKey = scryptSync(
    password,
    salt,
    64
  ).toString("hex");

  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyPassword(
  password: string,
  storedHash: string
) {
  const parts = storedHash.split("$");

  if (
    parts.length !== 3 ||
    parts[0] !== "scrypt"
  ) {
    return false;
  }

  const salt = parts[1];
  const storedKey = Buffer.from(
    parts[2],
    "hex"
  );

  const derivedKey = scryptSync(
    password,
    salt,
    64
  );

  if (
    storedKey.length !== derivedKey.length
  ) {
    return false;
  }

  return timingSafeEqual(
    storedKey,
    derivedKey
  );
}

export async function createAdminSession({
  userId,
  request,
}: {
  userId: string;
  request: Request;
}) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);

  const expiresAt = new Date(
    Date.now() +
      SESSION_TTL_SECONDS * 1000
  );

  const forwardedFor =
    request.headers.get("x-forwarded-for");

  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;

  const userAgent =
    request.headers.get("user-agent");

  await prisma.adminSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set(
    SESSION_COOKIE,
    token,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    }
  );

  const session = await prisma.adminSession.findUnique({
    where: {
      tokenHash,
    },
    select: {
      id: true,
      expiresAt: true,
    },
  });

  return {
    sessionId: session?.id ?? null,
    expiresAt,
  };
}

export async function getAdminSession() {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    SESSION_COOKIE
  )?.value;

  if (!token) {
    return null;
  }

  const tokenHash =
    hashSessionToken(token);

  const session =
    await prisma.adminSession.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
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

  return session;
}

export async function getCurrentAdminUser() {
  const session =
    await getAdminSession();

  return session?.user ?? null;
}

export async function requireCurrentAdminUser() {
  const user =
    await getCurrentAdminUser();

  if (!user) {
    return null;
  }

  if (!user.active) {
    return null;
  }

  if (user.role !== "ADMIN") {
    return null;
  }

  return user;
}

export async function revokeCurrentAdminSession({
  request,
}: {
  request: Request;
}) {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    SESSION_COOKIE
  )?.value;

  if (!token) {
    cookieStore.set(
      SESSION_COOKIE,
      "",
      {
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env.NODE_ENV ===
          "production",
        path: "/",
        maxAge: 0,
      }
    );

    return null;
  }

  const tokenHash =
    hashSessionToken(token);

  const session =
    await prisma.adminSession.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    });

  if (session && !session.revokedAt) {
    await prisma.adminSession.update({
      where: {
        id: session.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    const forwardedFor =
      request.headers.get(
        "x-forwarded-for"
      );

    const ipAddress =
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get(
        "x-real-ip"
      ) ||
      null;

    const userAgent =
      request.headers.get(
        "user-agent"
      );

    await writeAuditLog({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: AUDIT_ACTIONS.LOGOUT,
      entityType: "User",
      entityId: session.user.id,
      description: "Admin user logged out.",
      ipAddress,
      userAgent,
      referenceType: "AdminSession",
      referenceId: session.id,
    });
  }

  cookieStore.set(
    SESSION_COOKIE,
    "",
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge: 0,
    }
  );

  return session;
}