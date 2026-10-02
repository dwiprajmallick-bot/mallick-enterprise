import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireCurrentAdminUser,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

function generateGRNNumber() {
  const stamp = new Date()
    .toISOString()
    .replace(/\D/g, "")
    .slice(0, 14);

  const random = Math.floor(1000 + Math.random() * 9000);

  return `GRN-${stamp}-${random}`;
}

export async function GET() {
  try {
    const user = await requireCurrentAdminUser();

    const goodsReceipts = await prisma.gRN.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        items: true,
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
            status: true,
            orderDate: true,
          },
        },
      },
    });

    const result = goodsReceipts.map((grn) => {
      const receivedTotal = grn.items.reduce(
        (sum, item) => sum + Number(item.receivedQuantity || 0),
        0
      );

      const orderedTotal = grn.items.reduce(
        (sum, item) => sum + Number(item.orderedQuantity || 0),
        0
      );

      return {
        ...grn,
        receivedTotal,
        orderedTotal,
        itemCount: grn.items.length,
      };
    });

    await writeAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      ...getRequestAuditMeta(),
      action: "GRN_VIEW",
      entityType: "GoodsReceipt",
      entityId: null,
      description: "Viewed Goods Receipt register.",
      newValues: {
        count: result.length,
      },
    });

    return NextResponse.json({
      success: true,
      goodsReceipts: result,
    });
  } catch (error) {
    console.error("Goods Receipts GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Goods Receipts.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentAdminUser();

    const body = await request.json();

    const purchaseOrderId = String(
      body?.purchaseOrderId || ""
    ).trim();

    const notes =
      typeof body?.notes === "string"
        ? body.notes.trim()
        : null;

    if (!purchaseOrderId) {
      return NextResponse.json(
        {
          success: false,
          error: "Purchase Order is required.",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const purchaseOrder =
        await tx.purchaseOrder.findUnique({
          where: {
            id: purchaseOrderId,
          },
          include: {
            items: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

      if (!purchaseOrder) {
        throw new Error("Purchase Order not found.");
      }

      const allowedStatuses = [
        "APPROVED",
        "ISSUED",
        "ACKNOWLEDGED",
        "PARTIALLY_RECEIVED",
      ];

      if (
        !allowedStatuses.includes(
          purchaseOrder.status
        )
      ) {
        throw new Error(
          `GRN cannot be created from PO status ${purchaseOrder.status}.`
        );
      }

      if (!purchaseOrder.items.length) {
        throw new Error(
          "Purchase Order has no items."
        );
      }

      const remainingItems =
        purchaseOrder.items.filter(
          (item) =>
            Number(item.quantity) -
              Number(item.receivedQuantity || 0) >
            0
        );

      if (!remainingItems.length) {
        throw new Error(
          "This Purchase Order is already fully received."
        );
      }

      const receiptNumber = generateGRNNumber();

      const grn = await tx.gRN.create({
        data: {
          receiptNumber,
          purchaseOrderId:
            purchaseOrder.id,
          supplierId:
            purchaseOrder.supplierId,
          status: "DRAFT",
          notes,
          items: {
            create: purchaseOrder.items.map(
              (item) => ({
                purchaseOrderItemId:
                  item.id,
                productId:
                  item.productId,
                orderedQuantity:
                  item.quantity,
                receivedQuantity: 0,
                unitCostPaise:
                  item.unitCostPaise,
                gstRate:
                  item.gstRate,
                taxableAmountPaise: 0,
                gstPaise: 0,
                totalPaise: 0,
              })
            ),
          },
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
        action: "GRN_CREATE",
        entityType: "GoodsReceipt",
        entityId: grn.id,
        description:
          `Created GRN ${grn.receiptNumber} from Purchase Order ${purchaseOrder.poNumber}.`,
        newValues: {
          receiptNumber: grn.receiptNumber,
          purchaseOrderId:
            purchaseOrder.id,
          purchaseOrderNumber:
            purchaseOrder.poNumber,
          supplierId:
            purchaseOrder.supplierId,
          status: "DRAFT",
          itemCount: grn.items.length,
        },
        referenceType: "PurchaseOrder",
        referenceId:
          purchaseOrder.id,
      });

      return grn;
    });

    return NextResponse.json({
      success: true,
      goodsReceipt: result,
    });
  } catch (error) {
    console.error(
      "Goods Receipt CREATE error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Goods Receipt.",
      },
      { status: 500 }
    );
  }
}