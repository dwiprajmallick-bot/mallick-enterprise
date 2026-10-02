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

    const body = await request.json().catch(() => ({}));

    const postedBy =
      typeof body.postedBy === "string" &&
      body.postedBy.trim()
        ? body.postedBy.trim()
        : "admin";

    const result =
      await prisma.$transaction(
        async (tx) => {
          const grn =
            await tx.gRN.findUnique({
              where: {
                id,
              },
              include: {
                items: {
                  include: {
                    purchaseOrderItem: true,
                  },
                },
                purchaseOrder: {
                  include: {
                    items: true,
                  },
                },
              },
            });

          if (!grn) {
            throw new Error(
              "GRN not found."
            );
          }

          if (grn.status !== "DRAFT") {
            throw new Error(
              "Only DRAFT GRN can be posted."
            );
          }

          const activeItems =
            grn.items.filter(
              (item) =>
                item.receiveNow > 0
            );

          if (
            activeItems.length === 0
          ) {
            throw new Error(
              "At least one item must have Receive Now quantity greater than zero."
            );
          }

          for (const item of grn.items) {
            if (
              item.receiveNow < 0 ||
              item.receiveNow >
                item.remainingQty
            ) {
              throw new Error(
                `Invalid Receive Now quantity for GRN item ${item.id}.`
              );
            }
          }

          const receivedByPOItem =
            new Map<string, number>();

          for (const item of grn.items) {
            receivedByPOItem.set(
              item.purchaseOrderItemId,
              item.receiveNow
            );
          }

          let totalReceivedNow = 0;

          for (const item of grn.items) {
            totalReceivedNow +=
              item.receiveNow;

            if (
              item.receiveNow > 0
            ) {
              const poItem =
                item.purchaseOrderItem;

              const currentReceived =
                Number(
                  (poItem as any)
                    .receivedQuantity ?? 0
                );

              const newReceived =
                currentReceived +
                item.receiveNow;

              const orderedQty =
                Number(
                  (poItem as any)
                    .quantity ??
                    (poItem as any)
                      .orderedQuantity ??
                    item.orderedQty
                );

              if (
                newReceived >
                orderedQty
              ) {
                throw new Error(
                  `Received quantity cannot exceed ordered quantity for PO item ${poItem.id}.`
                );
              }

              const itemData: Record<
                string,
                unknown
              > = {};

              if (
                Object.prototype.hasOwnProperty.call(
                  poItem,
                  "receivedQuantity"
                )
              ) {
                itemData.receivedQuantity =
                  newReceived;
              }

              if (
                Object.prototype.hasOwnProperty.call(
                  poItem,
                  "receivedQty"
                )
              ) {
                itemData.receivedQty =
                  newReceived;
              }

              if (
                Object.keys(
                  itemData
                ).length > 0
              ) {
                await tx.purchaseOrderItem.update(
                  {
                    where: {
                      id: poItem.id,
                    },
                    data:
                      itemData as any,
                  }
                );
              }
            }
          }

          const poItems =
            await tx.purchaseOrderItem.findMany(
              {
                where: {
                  purchaseOrderId:
                    grn.purchaseOrderId,
                },
              }
            );

          let allReceived = true;
          let anyReceived = false;

          for (const poItem of poItems) {
            const orderedQty =
              Number(
                (poItem as any)
                  .quantity ??
                  (poItem as any)
                    .orderedQuantity ??
                  0
              );

            const receivedQty =
              Number(
                (poItem as any)
                  .receivedQuantity ??
                  (poItem as any)
                    .receivedQty ??
                  0
              );

            if (
              receivedQty > 0
            ) {
              anyReceived = true;
            }

            if (
              receivedQty <
              orderedQty
            ) {
              allReceived = false;
            }
          }

          let purchaseOrderStatus:
            | "PARTIALLY_RECEIVED"
            | "RECEIVED";

          if (allReceived) {
            purchaseOrderStatus =
              "RECEIVED";
          } else {
            purchaseOrderStatus =
              "PARTIALLY_RECEIVED";
          }

          const updatedPO =
            await tx.purchaseOrder.update(
              {
                where: {
                  id:
                    grn.purchaseOrderId,
                },
                data: {
                  status:
                    purchaseOrderStatus as any,
                },
              }
            );

          const postedAt =
            new Date();

          const updatedGRN =
            await tx.gRN.update({
              where: {
                id,
              },
              data: {
                status: "POSTED",
                postedAt,
                postedBy,
              },
              include: {
                items: true,
                purchaseOrder: true,
              },
            });

          return {
            grn:
              updatedGRN,
            purchaseOrder:
              updatedPO,
            totalReceivedNow,
            anyReceived,
          };
        }
      );

    return NextResponse.json({
      success: true,
      message:
        "GRN posted successfully.",
      result,
    });
  } catch (error) {
    console.error(
      "Post GRN error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to post GRN.",
      },
      { status: 500 }
    );
  }
}
