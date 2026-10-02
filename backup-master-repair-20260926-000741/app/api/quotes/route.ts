import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AUDIT_ACTIONS,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

export async function POST(request: Request) {
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

    if (!message) {
      return NextResponse.json(
        { error: "Products / requirement is required" },
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
        actorRole: "CUSTOMER",
        action: AUDIT_ACTIONS.CREATE,
        entityType: "QuoteRequest",
        entityId: createdQuote.id,
        description: "Customer submitted a quotation request.",
        newValues: createdQuote,
        referenceType: "QuoteRequest",
        referenceId: createdQuote.id,
      });

      return createdQuote;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Quotation request submitted successfully.",
        data: quote,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Public quote error:", error);

    return NextResponse.json(
      { error: "Failed to submit quotation request" },
      { status: 500 }
    );
  }
}