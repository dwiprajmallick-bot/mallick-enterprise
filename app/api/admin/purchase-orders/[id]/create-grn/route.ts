import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

function makeGrnNumber() {
  const now = new Date();

  const stamp =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  return `GRN-${stamp}-${Math.floor(Math.random() * 900 + 100)}`;
}

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

    const body = await request.json().catch(() => ({}));

    const requestedDate =
      body.receivedDate
        ? new Date(body.receivedDate)
        : new Date();

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : null;

    const purchaseOrder =
      await prisma.purchaseOrder.findUnique({
        where: {
          id,
        },
        include: {
          items: true,
        },
      });

    if (!purchaseOrder) {
      return NextResponse.json(
        {
          success: false,
          error: "Purchase Order not found.",
        },
        { status: 404 }
      );
    }

    const existingPosted =
      await prisma.gRNItem.findMany({
        where: {
          purchaseOrderItemId: {
            in: purchaseOrder.items.map(
              (item) => item.id
            ),
          },
          grn: {
            status: "POSTED",
          },
        },
        select: {
          purchaseOrderItemId: true,
          receiveNow: true,
        },
      });

    const receivedMap =
      new Map<string, number>();

    for (const row of existingPosted) {
      receivedMap.set(
        row.purchaseOrderItemId,
        (receivedMap.get(
          row.purchaseOrderItemId
        ) || 0) + row.receiveNow
      );
    }

    const grnItems =
      purchaseOrder.items.map((item) => {
        const orderedQty =
          Number(
            item.quantity ??
              item.orderedQuantity ??
              0
          );

        const alreadyReceived =
          receivedMap.get(item.id) || 0;

        const remainingQty =
          Math.max(
            orderedQty - alreadyReceived,
            0
          );

        return {
          purchaseOrderItemId: item.id,
          orderedQty,
          alreadyReceived,
          remainingQty,
          receiveNow: 0,
        };
      });

    const hasRemainingItems =
      grnItems.some(
        (item) =>
          item.remainingQty > 0
      );

    if (!hasRemainingItems) {
      return NextResponse.json(
        {
          success: false,
          error:
            "All Purchase Order quantities have already been received.",
        },
        { status: 400 }
      );
    }

    const grnNumber =
      makeGrnNumber();

    const grn =
      await prisma.gRN.create({
        data: {
          grnNumber,
          purchaseOrderId:
            purchaseOrder.id,
          supplierId:
            purchaseOrder.supplierId ?? null,
          receivedDate:
            requestedDate,
          status:
            "DRAFT",
          notes,
          items: {
            create:
              grnItems.map((item) => ({
                purchaseOrderItemId:
                  item.purchaseOrderItemId,
                orderedQty:
                  item.orderedQty,
                alreadyReceived:
                  item.alreadyReceived,
                remainingQty:
                  item.remainingQty,
                receiveNow:
                  0,
              })),
          },
        },
        include: {
          items: true,
          purchaseOrder: true,
        },
      });

    return NextResponse.json({
      success: true,
      grn,
    });
  } catch (error) {
    console.error(
      "Create GRN error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create GRN.",
      },
      { status: 500 }
    );
  }
}
