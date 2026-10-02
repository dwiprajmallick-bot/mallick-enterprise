import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();

    const adminCookie =
      cookieStore.get("officekart_admin")?.value;

    if (adminCookie !== "authenticated") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const body =
      await request.json().catch(() => ({}));

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : "";

    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cancellation reason is required.",
        },
        { status: 400 }
      );
    }

    const grn =
      await prisma.gRN.findUnique({
        where: {
          id,
        },
        include: {
          items: true,
        },
      });

    if (!grn) {
      return NextResponse.json(
        {
          success: false,
          error: "GRN not found.",
        },
        { status: 404 }
      );
    }

    if (grn.status === "POSTED") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Posted GRN cannot be cancelled. Use a controlled reversal process.",
        },
        { status: 400 }
      );
    }

    if (grn.status === "CANCELLED") {
      return NextResponse.json(
        {
          success: false,
          error:
            "GRN is already cancelled.",
        },
        { status: 400 }
      );
    }

    const cancelledAt =
      new Date();

    const cancelledBy =
      typeof body.cancelledBy === "string" &&
      body.cancelledBy.trim()
        ? body.cancelledBy.trim()
        : "admin";

    const updatedGRN =
      await prisma.gRN.update({
        where: {
          id,
        },
        data: {
          status: "CANCELLED",
          notes:
            grn.notes
              ? `${grn.notes}\nCancellation reason: ${reason}`
              : `Cancellation reason: ${reason}`,
        },
        include: {
          items: true,
          purchaseOrder: true,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "GRN cancelled successfully.",
      cancelledAt,
      cancelledBy,
      reason,
      grn: updatedGRN,
    });
  } catch (error) {
    console.error(
      "Cancel GRN error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to cancel GRN.",
      },
      { status: 500 }
    );
  }
}
