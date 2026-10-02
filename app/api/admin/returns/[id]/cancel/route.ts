import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireCurrentAdminUser,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const user = await requireCurrentAdminUser();

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Sales return ID is required.",
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const reason = String(
      body.reason ?? ""
    ).trim();

    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          error: "Cancellation reason is required.",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const salesReturn =
        await tx.salesReturn.findUnique({
          where: {
            id,
          },
        });

      if (!salesReturn) {
        throw new Error(
          "Sales return not found."
        );
      }

      if (salesReturn.status === "CANCELLED") {
        throw new Error(
          "This sales return is already cancelled."
        );
      }

      if (salesReturn.refundStatus === "REFUNDED") {
        throw new Error(
          "A refunded sales return cannot be cancelled. Reverse the refund first."
        );
      }

      /*
       * SalesReturnItem does not have a Prisma relation
       * to SalesReturn, therefore items are loaded directly.
       */
      const returnItems =
        await tx.salesReturnItem.findMany({
          where: {
            returnId: salesReturn.id,
          },
        });

      if (returnItems.length === 0) {
        throw new Error(
          "No return items were found for this sales return."
        );
      }

      for (const item of returnItems) {
        const product =
          await tx.product.findUnique({
            where: {
              id: item.productId,
            },
        });

        if (!product) {
          throw new Error(
            `Product ${item.productId} not found.`
          );
        }

        const previousStock = product.stock;

        /*
         * The original return increased stock.
         * Cancellation therefore reverses that IN movement.
         */
        const newStock =
          previousStock - item.quantity;

        if (newStock < 0) {
          throw new Error(
            `Cannot cancel return ${salesReturn.returnNumber}. Product ${item.productId} has insufficient current stock for stock reversal.`
          );
        }

        await tx.product.update({
          where: {
            id: product.id,
          },
          data: {
            stock: newStock,
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "OUT",
            quantity: -item.quantity,
            previousStock,
            newStock,
            note: `Sales return cancellation reversal ${salesReturn.returnNumber}`,
          },
        });

        await writeAuditLog({
          db: tx,
          actorUserId: user.id,
          actorRole: user.role,
          ...getRequestAuditMeta(request),
          action: "STOCK_OUT",
          entityType: "Product",
          entityId: product.id,
          description: `Stock reversed because sales return ${salesReturn.returnNumber} was cancelled.`,
          oldValues: {
            stock: previousStock,
          },
          newValues: {
            stock: newStock,
          },
          reason,
          referenceType: "SalesReturn",
          referenceId: salesReturn.id,
        });
      }

      const oldValues = {
        status: salesReturn.status,
        refundStatus: salesReturn.refundStatus,
        refundAmount: salesReturn.refundAmount,
      };

      const updatedReturn =
        await tx.salesReturn.update({
          where: {
            id: salesReturn.id,
          },
          data: {
            status: "CANCELLED",
            refundStatus:
              salesReturn.refundStatus === "PENDING"
                ? "CANCELLED"
                : salesReturn.refundStatus,
            refundAmount: 0,
            updatedAt: new Date(),
          },
        });

      await writeAuditLog({
        db: tx,
        actorUserId: user.id,
        actorRole: user.role,
        ...getRequestAuditMeta(request),
        action: "RETURN_CANCEL",
        entityType: "SalesReturn",
        entityId: salesReturn.id,
        description: `Sales return ${salesReturn.returnNumber} cancelled and stock reversal completed.`,
        oldValues,
        newValues: {
          status: updatedReturn.status,
          refundStatus:
            updatedReturn.refundStatus,
          refundAmount:
            updatedReturn.refundAmount,
        },
        reason,
        referenceType: "Order",
        referenceId: salesReturn.orderId,
      });

      return {
        salesReturn: updatedReturn,
        reversedItems: returnItems.length,
      };
    });

    return NextResponse.json({
      success: true,
      message:
        "Sales return cancelled and stock reversed successfully.",
      return: result.salesReturn,
      reversedItems: result.reversedItems,
    });
  } catch (error) {
    console.error(
      "POST /api/admin/returns/[id]/cancel error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to cancel sales return.";

    const status =
      message.includes("not found") ||
      message.includes("already") ||
      message.includes("cannot") ||
      message.includes("No return items") ||
      message.includes("insufficient")
        ? 400
        : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}