import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function PUT(
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

    const body = await request.json();

    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        {
          success: false,
          error: "items must be an array.",
        },
        { status: 400 }
      );
    }

    const grn = await prisma.gRN.findUnique({
      where: {
        id,
      },
      include: {
        items: true,
        purchaseOrder: true,
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

    if (grn.status !== "DRAFT") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only DRAFT GRN can be edited.",
        },
        { status: 400 }
      );
    }

    const requestedItems = body.items as Array<{
      id?: string;
      grnItemId?: string;
      receiveNow?: number;
    }>;

    const updates = [];

    for (const requested of requestedItems) {
      const itemId =
        requested.id ??
        requested.grnItemId;

      if (!itemId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Each item requires an id.",
          },
          { status: 400 }
        );
      }

      const grnItem =
        grn.items.find(
          (item) =>
            item.id === itemId
        );

      if (!grnItem) {
        return NextResponse.json(
          {
            success: false,
            error:
              `GRN item ${itemId} not found.`,
          },
          { status: 404 }
        );
      }

      const receiveNow =
        Number(
          requested.receiveNow ?? 0
        );

      if (
        !Number.isInteger(
          receiveNow
        ) ||
        receiveNow < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Invalid Receive Now quantity for item ${itemId}.`,
          },
          { status: 400 }
        );
      }

      if (
        receiveNow >
        grnItem.remainingQty
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Receive Now cannot exceed Remaining Qty for item ${itemId}.`,
          },
          { status: 400 }
        );
      }

      updates.push({
        id: grnItem.id,
        receiveNow,
      });
    }

    const updatedGRN =
      await prisma.$transaction(
        async (tx) => {
          for (const update of updates) {
            await tx.gRNItem.update({
              where: {
                id: update.id,
              },
              data: {
                receiveNow:
                  update.receiveNow,
              },
            });
          }

          return tx.gRN.findUnique({
            where: {
              id,
            },
            include: {
              items: true,
              purchaseOrder: true,
            },
          });
        }
      );

    return NextResponse.json({
      success: true,
      message:
        "GRN Receive Now quantities updated successfully.",
      grn: updatedGRN,
    });
  } catch (error) {
    console.error(
      "Update GRN items error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update GRN items.",
      },
      { status: 500 }
    );
  }
}
