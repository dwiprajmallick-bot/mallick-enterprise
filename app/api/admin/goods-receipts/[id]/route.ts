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

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const user = await requireCurrentAdminUser();

    const { id } = await context.params;

    const grn = await prisma.gRN.findUnique({
      where: {
        id,
      },
      include: {
        items: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            product: true,
          },
        },
        purchaseOrder: {
          include: {
            items: {
              include: {
                product: true,
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    });

    if (!grn) {
      return NextResponse.json(
        {
          success: false,
          error: "Goods Receipt not found.",
        },
        { status: 404 }
      );
    }

    const items = grn.items.map((item) => {
      const poItem =
        grn.purchaseOrder.items.find(
          (candidate) =>
            candidate.id ===
            item.purchaseOrderItemId
        );

      const ordered =
        Number(item.orderedQuantity || 0);

      const alreadyReceived =
        Number(
          poItem?.receivedQuantity || 0
        );

      const remaining = Math.max(
        ordered - alreadyReceived,
        0
      );

      return {
        ...item,
        orderedQty: ordered,
        alreadyReceived,
        remainingQty: remaining,
        receiveNow:
          Number(item.receivedQuantity || 0),
      };
    });

    await writeAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      ...getRequestAuditMeta(request),
      action: "GRN_VIEW",
      entityType: "GoodsReceipt",
      entityId: grn.id,
      description:
        `Viewed GRN ${grn.receiptNumber}.`,
      referenceType: "GoodsReceipt",
      referenceId: grn.id,
    });

    return NextResponse.json({
      success: true,
      goodsReceipt: {
        ...grn,
        items,
      },
    });
  } catch (error) {
    console.error(
      "Goods Receipt detail GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Goods Receipt.",
      },
      { status: 500 }
    );
  }
}