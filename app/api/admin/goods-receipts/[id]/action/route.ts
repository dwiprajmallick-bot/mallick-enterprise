import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireCurrentAdminUser,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function toPositiveInteger(
  value: unknown
) {
  const number = Number(value);

  if (
    !Number.isInteger(number) ||
    number < 0
  ) {
    return null;
  }

  return number;
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const user = await requireCurrentAdminUser();

    const { id } = await context.params;

    const body = await request.json();

    const action = String(
      body?.action || ""
    ).trim().toUpperCase();

    if (
      ![
        "UPDATE",
        "POST",
        "CANCEL",
      ].includes(action)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid GRN action. Use UPDATE, POST or CANCEL.",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const grn =
          await tx.gRN.findUnique({
            where: {
              id,
            },
            include: {
              items: true,
              purchaseOrder: {
                include: {
                  items: true,
                },
              },
            },
          });

        if (!grn) {
          throw new Error(
            "Goods Receipt not found."
          );
        }

        if (action === "UPDATE") {
          if (grn.status !== "DRAFT") {
            throw new Error(
              "Only a DRAFT GRN can be updated."
            );
          }

          const incomingItems =
            Array.isArray(body?.items)
              ? body.items
              : [];

          const incomingMap =
            new Map<string, number>();

          for (const item of incomingItems) {
            const itemId =
              String(item?.id || "").trim();

            if (!itemId) {
              continue;
            }

            const quantity =
              toPositiveInteger(
                item?.receiveNow ??
                  item?.receivedQuantity
              );

            if (quantity === null) {
              throw new Error(
                `Invalid receive quantity for GRN item ${itemId}.`
              );
            }

            incomingMap.set(
              itemId,
              quantity
            );
          }

          for (const grnItem of grn.items) {
            const receiveNow =
              incomingMap.get(
                grnItem.id
              ) ?? 0;

            const poItem =
              grn.purchaseOrder.items.find(
                (item) =>
                  item.id ===
                  grnItem.purchaseOrderItemId
              );

            if (!poItem) {
              throw new Error(
                `Purchase Order item not found for GRN item ${grnItem.id}.`
              );
            }

            const alreadyReceived =
              Number(
                poItem.receivedQuantity || 0
              );

            const remaining =
              Math.max(
                Number(poItem.quantity) -
                  alreadyReceived,
                0
              );

            if (
              receiveNow >
              remaining
            ) {
              throw new Error(
                `Excess receiving blocked for product ${grnItem.productId}. Ordered ${poItem.quantity}, already received ${alreadyReceived}, remaining ${remaining}, attempted ${receiveNow}.`
              );
            }

            const taxableAmountPaise =
              receiveNow *
              Number(
                grnItem.unitCostPaise || 0
              );

            const gstPaise = Math.round(
              taxableAmountPaise *
                (Number(
                  grnItem.gstRate || 0
                ) /
                  100)
            );

            const totalPaise =
              taxableAmountPaise +
              gstPaise;

            await tx.goodsReceiptItem.update({
              where: {
                id: grnItem.id,
              },
              data: {
                receivedQuantity:
                  receiveNow,
                taxableAmountPaise,
                gstPaise,
                totalPaise,
              },
            });
          }

          const updated =
            await tx.gRN.findUnique({
              where: {
                id: grn.id,
              },
              include: {
                items: true,
              },
            });

          await writeAuditLog({
            db: tx,
            actorUserId: user.id,
            actorRole: user.role,
            ...getRequestAuditMeta(request),
            action: "GRN_UPDATE",
            entityType: "GoodsReceipt",
            entityId: grn.id,
            description:
              `Updated GRN ${grn.receiptNumber} receiving quantities.`,
            oldValues: {
              status: grn.status,
            },
            newValues: {
              status: "DRAFT",
              items: updated?.items.map(
                (item) => ({
                  id: item.id,
                  receivedQuantity:
                    item.receivedQuantity,
                })
              ),
            },
            referenceType:
              "GoodsReceipt",
            referenceId: grn.id,
          });

          return updated;
        }

        if (action === "POST") {
          if (grn.status !== "DRAFT") {
            throw new Error(
              "Only a DRAFT GRN can be posted."
            );
          }

          const grnItems =
            await tx.goodsReceiptItem.findMany({
              where: {
                goodsReceiptId:
                  grn.id,
              },
            });

          if (!grnItems.length) {
            throw new Error(
              "GRN has no items."
            );
          }

          const positiveItems =
            grnItems.filter(
              (item) =>
                Number(
                  item.receivedQuantity
                ) > 0
            );

          if (!positiveItems.length) {
            throw new Error(
              "Receive Now quantity must be greater than zero for at least one item."
            );
          }

          for (const item of grnItems) {
            const poItem =
              grn.purchaseOrder.items.find(
                (candidate) =>
                  candidate.id ===
                  item.purchaseOrderItemId
              );

            if (!poItem) {
              throw new Error(
                `Purchase Order item not found for GRN item ${item.id}.`
              );
            }

            const alreadyReceived =
              Number(
                poItem.receivedQuantity || 0
              );

            const remaining =
              Math.max(
                Number(poItem.quantity) -
                  alreadyReceived,
                0
              );

            const receiveNow =
              Number(
                item.receivedQuantity || 0
              );

            if (
              receiveNow >
              remaining
            ) {
              throw new Error(
                `Cannot post GRN ${grn.receiptNumber}. Receiving quantity exceeds remaining quantity for PO item ${poItem.id}.`
              );
            }
          }

          for (const item of grnItems) {
            const receiveNow =
              Number(
                item.receivedQuantity || 0
              );

            if (receiveNow <= 0) {
              continue;
            }

            const poItem =
              grn.purchaseOrder.items.find(
                (candidate) =>
                  candidate.id ===
                  item.purchaseOrderItemId
              );

            if (!poItem) {
              throw new Error(
                "PO item missing during GRN posting."
              );
            }

            await tx.purchaseOrderItem.update({
              where: {
                id: poItem.id,
              },
              data: {
                receivedQuantity: {
                  increment:
                    receiveNow,
                },
              },
            });
          }

          const refreshedPO =
            await tx.purchaseOrder.findUnique({
              where: {
                id:
                  grn.purchaseOrderId,
              },
              include: {
                items: true,
              },
            });

          if (!refreshedPO) {
            throw new Error(
              "Purchase Order disappeared during GRN posting."
            );
          }

          const fullyReceived =
            refreshedPO.items.every(
              (item) =>
                Number(
                  item.receivedQuantity || 0
                ) >=
                Number(item.quantity)
            );

          const partiallyReceived =
            refreshedPO.items.some(
              (item) =>
                Number(
                  item.receivedQuantity || 0
                ) > 0
            );

          let nextPOStatus =
            refreshedPO.status;

          if (fullyReceived) {
            nextPOStatus = "RECEIVED";
          } else if (
            partiallyReceived
          ) {
            nextPOStatus =
              "PARTIALLY_RECEIVED";
          }

          const poUpdateData: Record<
            string,
            unknown
          > = {
            status: nextPOStatus,
          };

          if (
            nextPOStatus ===
            "PARTIALLY_RECEIVED"
          ) {
            poUpdateData.partiallyReceivedAt =
              new Date();
          }

          if (
            nextPOStatus === "RECEIVED"
          ) {
            poUpdateData.receivedAt =
              new Date();
          }

          await tx.purchaseOrder.update({
            where: {
              id:
                refreshedPO.id,
            },
            data: poUpdateData,
          });

          const postedAt =
            new Date();

          const updated =
            await tx.gRN.update({
              where: {
                id: grn.id,
              },
              data: {
                status: "POSTED",
                postedAt,
              },
              include: {
                items: true,
              },
            });

          await writeAuditLog({
            db: tx,
            actorUserId: user.id,
            actorRole: user.role,
            ...getRequestAuditMeta(request),
            action: "GRN_POST",
            entityType: "GoodsReceipt",
            entityId: grn.id,
            description:
              `Posted GRN ${grn.receiptNumber}. PO ${refreshedPO.poNumber} updated to ${nextPOStatus}.`,
            oldValues: {
              grnStatus: grn.status,
              poStatus:
                refreshedPO.status,
            },
            newValues: {
              grnStatus: "POSTED",
              poStatus:
                nextPOStatus,
              postedAt,
              items: grnItems.map(
                (item) => ({
                  id: item.id,
                  purchaseOrderItemId:
                    item.purchaseOrderItemId,
                  receivedQuantity:
                    item.receivedQuantity,
                })
              ),
            },
            referenceType:
              "PurchaseOrder",
            referenceId:
              refreshedPO.id,
          });

          await writeAuditLog({
            db: tx,
            actorUserId: user.id,
            actorRole: user.role,
            ...getRequestAuditMeta(request),
            action: "PURCHASE_ORDER_RECEIVE",
            entityType: "PurchaseOrder",
            entityId:
              refreshedPO.id,
            description:
              `Purchase Order ${refreshedPO.poNumber} receiving quantities updated from GRN ${grn.receiptNumber}.`,
            oldValues: {
              status:
                refreshedPO.status,
            },
            newValues: {
              status:
                nextPOStatus,
              receivedQuantities:
                refreshedPO.items.map(
                  (item) => ({
                    id: item.id,
                    quantity:
                      item.quantity,
                    receivedQuantity:
                      item.receivedQuantity,
                  })
                ),
            },
            referenceType:
              "GoodsReceipt",
            referenceId:
              grn.id,
          });

          return updated;
        }

        if (grn.status !== "DRAFT") {
          throw new Error(
            "Only a DRAFT GRN can be cancelled."
          );
        }

        const reason =
          String(
            body?.reason || ""
          ).trim();

        if (!reason) {
          throw new Error(
            "Cancellation reason is required."
          );
        }

        const cancelledAt =
          new Date();

        const updated =
          await tx.gRN.update({
            where: {
              id: grn.id,
            },
            data: {
              status: "CANCELLED",
              cancelledAt,
              cancellationReason:
                reason,
            },
            include: {
              items: true,
            },
          });

        await writeAuditLog({
          db: tx,
          actorUserId: user.id,
          actorRole: user.role,
          ...getRequestAuditMeta(request),
          action: "GRN_CANCEL",
          entityType: "GoodsReceipt",
          entityId: grn.id,
          description:
            `Cancelled GRN ${grn.receiptNumber}.`,
          oldValues: {
            status: grn.status,
          },
          newValues: {
            status: "CANCELLED",
            cancelledAt,
            cancellationReason:
              reason,
          },
          reason,
          referenceType:
            "PurchaseOrder",
          referenceId:
            grn.purchaseOrderId,
        });

        return updated;
      }
    );

    return NextResponse.json({
      success: true,
      goodsReceipt: result,
    });
  } catch (error) {
    console.error(
      "Goods Receipt action error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process Goods Receipt.",
      },
      { status: 400 }
    );
  }
}