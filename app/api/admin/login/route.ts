import { NextResponse } from "next/server";

import {
  createAdminSession,
  hashPassword,
  verifyPassword,
} from "@/lib/admin-auth";

import { prisma } from "@/lib/prisma";

import {
  AUDIT_ACTIONS,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Username and password are required.",
        },
        { status: 400 }
      );
    }

    const configuredUsername =
      process.env.OFFICEKART_ADMIN_USERNAME || "admin";

    const configuredPassword =
      process.env.OFFICEKART_ADMIN_PASSWORD || "OfficeKart@123";

    /*
     * Bootstrap authentication must validate both
     * username and password BEFORE creating the first
     * admin user.
     */
    if (
      username !== configuredUsername ||
      password !== configuredPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password.",
        },
        { status: 401 }
      );
    }

    let user = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    /*
     * First successful authentication creates the
     * permanent ADMIN user with a hashed password.
     */
    if (!user) {
      const passwordHash = hashPassword(password);

      user = await prisma.user.create({
        data: {
          username,
          name: "OfficeKart Admin",
          passwordHash,
          role: "ADMIN",
          active: true,
          lastLoginAt: new Date(),
        },
      });

      const meta = getRequestAuditMeta(request);

      await writeAuditLog({
        ...meta,
        actorUserId: user.id,
        actorRole: user.role,
        action: AUDIT_ACTIONS.CREATE,
        entityType: "User",
        entityId: user.id,
        description:
          "Initial OfficeKart admin user was created during authentication bootstrap.",
        newValues: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          active: user.active,
        },
        referenceType: "Authentication",
        referenceId: user.id,
      });
    }

    if (!user.active || user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This account is not authorized for admin access.",
        },
        { status: 403 }
      );
    }

    if (
      !user.passwordHash ||
      !verifyPassword(password, user.passwordHash)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password.",
        },
        { status: 401 }
      );
    }

    const oldLastLoginAt = user.lastLoginAt;

    user = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const session = await createAdminSession({
      userId: user.id,
      request,
    });

    const meta = getRequestAuditMeta(request);

    await writeAuditLog({
      ...meta,
      actorUserId: user.id,
      actorRole: user.role,
      action: AUDIT_ACTIONS.LOGIN,
      entityType: "User",
      entityId: user.id,
      description: "Admin user logged in successfully.",
      oldValues: {
        lastLoginAt: oldLastLoginAt,
      },
      newValues: {
        lastLoginAt: user.lastLoginAt,
      },
      referenceType: "AdminSession",
      referenceId: session.sessionId,
      sessionId: session.sessionId,
    });

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
    });

    /*
     * Temporary compatibility cookie.
     * Protected APIs do NOT trust this cookie anymore.
     */
    response.cookies.set(
      "officekart_admin",
      "authenticated",
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24,
      }
    );

    return response;
  } catch (error) {
    console.error("Admin login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Login failed.",
      },
      { status: 500 }
    );
  }
}