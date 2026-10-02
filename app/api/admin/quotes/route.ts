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
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const quotes = await prisma.quoteRequest.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    const meta = getRequestAuditMeta(request);

    await writeAuditLog({
      ...meta,
      actorRole: "ADMIN",
      action: AUDIT_ACTIONS.VIEW,
      entityType: "QuoteRequest",
      description: "Viewed quote request list.",
    });

    return NextResponse.json(quotes);
  } catch (error) {
    console.error("Get quotes error:", error);

    return NextResponse.json(
      { error: "Failed to fetch quote requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim();
    const companyName = String(body.companyName ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const meta = getRequestAuditMeta(request);

    const quote = await prisma.$transaction(async (tx) => {

      const createdQuote = await tx.quoteRequest.create({
        data: {
          name,
          phone,
          email: email || null,
          companyName: companyName || null,
          message: message || null,
        },
      });

      await writeAuditLog({
        ...meta,
        db: tx,
        actorRole: "ADMIN",
        action: AUDIT_ACTIONS.CREATE,
        entityType: "QuoteRequest",
        entityId: createdQuote.id,
        description: "Created quote request from admin.",
        newValues: createdQuote,
        referenceType: "QuoteRequest",
        referenceId: createdQuote.id,
      });

      return createdQuote;
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error("Create quote error:", error);

    return NextResponse.json(
      { error: "Failed to create quote request" },
      { status: 500 }
    );
  }
}