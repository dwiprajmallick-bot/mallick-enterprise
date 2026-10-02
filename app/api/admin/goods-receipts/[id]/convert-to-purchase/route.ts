import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireCurrentAdminUser,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

function makePurchaseNumber() {
  const d = new Date();

  const stamp =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");

  const random =
    Math.floor(100000 + Math.random() * 900000);

  return `PUR-${stamp}-${random}`;
}

function makeGstNumber() {
  const d = new Date();

  const stamp =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");

  const random =
    Math.floor(100000 + Math.random() * 900000);

  return `GST-${stamp}-${random}`;
}

function makeLedgerNumber() {
  const d = new Date();

  const stamp =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");

  const random =
    Math.floor(100000 + Math.random() * 900000);

  return `LED-${stamp}-${random}`;
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {

    const user =
      await requireCurrentAdminUser(request);

    const { id } =
      await context.params;

    const body =
      await request.json().catch(() => ({}));

    const notes =
      String(body.notes || "").trim();

    const result =
      await prisma.$transaction(async (tx) => {

        const receipt =
          await tx.goodsReceipt.findUnique({
            where: {
              id,
            },
          });

        if (!receipt) {
          throw new Error(
            "Goods Receipt not found."
          );
        }

        if (receipt.status !== "POSTED") {
          throw new Error(
            "Only a POSTED GRN can be converted to Purchase."
          );
        }

        const existingPurchase =
          await tx.purchase.findUnique({
            where: {
              goodsReceiptId:
                receipt.id,
            },
          });

        if (existingPurchase) {
          throw new Error(
            `This GRN has already been converted to Purchase ${existingPurchase.purchaseNumber}.`
          );
        }

        const purchaseOrder =
          await tx.purchaseOrder.findUnique({
            where: {
              id:
                receipt.purchaseOrderId,
            },
          });

        if (!purchaseOrder) {
          throw new Error(
            "Linked Purchase Order not found."
          );
        }

        if (
          purchaseOrder.supplierId !==
          receipt.supplierId
        ) {
          throw new Error(
            "GRN supplier does not match Purchase Order supplier."
          );
        }

        const grnItems =
          await tx.goodsReceiptItem.findMany({
            where: {
              goodsReceiptId:
                receipt.id,
            },
          });

        if (grnItems.length === 0) {
          throw new Error(
            "GRN has no items."
          );
        }

        const prepared = [];

        for (const item of grnItems) {

          if (
            item.receivedQuantity <= 0
          ) {
            throw new Error(
              "Purchase cannot contain zero or negative received quantity."
            );
          }

          const taxableAmountPaise =
            item.unitCostPaise *
            item.receivedQuantity;

          const gstPaise =
            Math.round(
              taxableAmountPaise *
              (item.gstRate / 100)
            );

          const totalPaise =
            taxableAmountPaise +
            gstPaise;

          prepared.push({
            productId:
              item.productId,

            quantity:
              item.receivedQuantity,

            unitCostPaise:
              item.unitCostPaise,

            gstRate:
              item.gstRate,

            taxableAmountPaise,

            gstPaise,

            totalPaise,
          });
        }

        const subtotalPaise =
          prepared.reduce(
            (sum, item) =>
              sum +
              item.taxableAmountPaise,
            0
          );

        const gstPaise =
          prepared.reduce(
            (sum, item) =>
              sum +
              item.gstPaise,
            0
          );

        const totalPaise =
          subtotalPaise +
          gstPaise;

        const purchaseNumber =
          makePurchaseNumber();

        const purchase =
          await tx.purchase.create({
            data: {
              purchaseNumber,

              supplierId:
                receipt.supplierId,

              status:
                "RECEIVED",

              subtotalPaise,

              gstPaise,

              deliveryPaise:
                0,

              totalPaise,

              paymentStatus:
                "UNPAID",

              notes:
                notes ||
                `Converted from GRN ${receipt.receiptNumber} / PO ${purchaseOrder.poNumber}`,

              goodsReceiptId:
                receipt.id,
            },
          });

        await tx.purchaseItem.createMany({
          data:
            prepared.map((item) => ({
              purchaseId:
                purchase.id,

              productId:
                item.productId,

              quantity:
                item.quantity,

              unitCostPaise:
                item.unitCostPaise,

              gstRate:
                item.gstRate,

              taxableAmountPaise:
                item.taxableAmountPaise,

              gstPaise:
                item.gstPaise,

              totalPaise:
                item.totalPaise,
            })),
        });

        const costHistoryRows = [];

        for (const item of prepared) {

          const product =
            await tx.product.findUnique({
              where: {
                id:
                  item.productId,
              },
            });

          if (!product) {
            throw new Error(
              `Product not found: ${item.productId}`
            );
          }

          const previousStock =
            product.stock;

          const newStock =
            previousStock +
            item.quantity;

          const previousUnitCostPaise =
            Math.round(
              Number(
                product.purchasePrice || 0
              ) * 100
            );

          const newUnitCostPaise =
            item.unitCostPaise;

          await tx.product.update({
            where: {
              id:
                product.id,
            },

            data: {
              stock:
                newStock,

              purchasePrice:
                item.unitCostPaise / 100,
            },
          });

          await tx.stockMovement.create({
            data: {
              productId:
                product.id,

              type:
                "IN",

              quantity:
                item.quantity,

              previousStock,

              newStock,

              note:
                `Purchase ${purchase.purchaseNumber} from GRN ${receipt.receiptNumber}`,
            },
          });

          costHistoryRows.push({
            productId:
              product.id,

            supplierId:
              receipt.supplierId,

            purchaseId:
              purchase.id,

            purchaseNumber:
              purchase.purchaseNumber,

            previousUnitCostPaise,

            newUnitCostPaise,

            quantity:
              item.quantity,

            reason:
              `Purchase posted from GRN ${receipt.receiptNumber}`,
          });

          await writeAuditLog({
            db: tx,

            actorUserId:
              user.id,

            actorRole:
              user.role,

            ...getRequestAuditMeta(request),

            action:
              "STOCK_IN",

            entityType:
              "Product",

            entityId:
              product.id,

            description:
              `Stock received through Purchase ${purchase.purchaseNumber} converted from GRN ${receipt.receiptNumber}.`,

            oldValues: {
              stock:
                previousStock,

              purchasePrice:
                product.purchasePrice,
            },

            newValues: {
              stock:
                newStock,

              purchasePrice:
                item.unitCostPaise / 100,
            },

            referenceType:
              "Purchase",

            referenceId:
              purchase.id,
          });
        }

        if (costHistoryRows.length > 0) {

          await tx.productCostHistory.createMany({
            data:
              costHistoryRows,
          });
        }

        const gstRecord =
          await tx.gstRecord.create({
            data: {
              gstNumber:
                makeGstNumber(),

              entryType:
                "PURCHASE",

              sourceType:
                "Purchase",

              sourceId:
                purchase.id,

              gstRate:
                prepared.length === 1
                  ? prepared[0].gstRate
                  : 0,

              taxablePaise:
                subtotalPaise,

              gstPaise,

              status:
                "ACTIVE",

              notes:
                `Input GST from Purchase ${purchase.purchaseNumber}; source GRN ${receipt.receiptNumber}`,
            },
          });

        await writeAuditLog({
          db: tx,

          actorUserId:
            user.id,

          actorRole:
            user.role,

          ...getRequestAuditMeta(request),

          action:
            "GST_CREATE",

          entityType:
            "GstRecord",

          entityId:
            gstRecord.id,

          description:
            `Purchase input GST created for ${purchase.purchaseNumber}.`,

          newValues: {
            gstNumber:
              gstRecord.gstNumber,

            taxablePaise:
              subtotalPaise,

            gstPaise,
          },

          referenceType:
            "Purchase",

          referenceId:
            purchase.id,
        });

        const ledger =
          await tx.ledgerEntry.create({
            data: {
              ledgerNumber:
                makeLedgerNumber(),

              entryType:
                "PURCHASE",

              accountType:
                "SUPPLIER",

              accountId:
                receipt.supplierId,

              purchaseId:
                purchase.id,

              amountPaise:
                totalPaise,

              description:
                `Purchase ${purchase.purchaseNumber} from supplier; source GRN ${receipt.receiptNumber}.`,

              referenceType:
                "Purchase",

              referenceId:
                purchase.id,
            },
          });

        await writeAuditLog({
          db: tx,

          actorUserId:
            user.id,

          actorRole:
            user.role,

          ...getRequestAuditMeta(request),

          action:
            "LEDGER_CREATE",

          entityType:
            "LedgerEntry",

          entityId:
            ledger.id,

          description:
            `Supplier payable ledger created for Purchase ${purchase.purchaseNumber}.`,

          newValues: {
            ledgerNumber:
              ledger.ledgerNumber,

            entryType:
              ledger.entryType,

            accountType:
              ledger.accountType,

            accountId:
              ledger.accountId,

            amountPaise:
              ledger.amountPaise,
          },

          referenceType:
            "Purchase",

          referenceId:
            purchase.id,
        });

        await writeAuditLog({
          db: tx,

          actorUserId:
            user.id,

          actorRole:
            user.role,

          ...getRequestAuditMeta(request),

          action:
            "PURCHASE_CREATE",

          entityType:
            "Purchase",

          entityId:
            purchase.id,

          description:
            `Purchase ${purchase.purchaseNumber} created from GRN ${receipt.receiptNumber}.`,

          newValues: {
            purchaseNumber:
              purchase.purchaseNumber,

            supplierId:
              purchase.supplierId,

            subtotalPaise:
              purchase.subtotalPaise,

            gstPaise:
              purchase.gstPaise,

            totalPaise:
              purchase.totalPaise,

            goodsReceiptId:
              receipt.id,
          },

          referenceType:
            "GoodsReceipt",

          referenceId:
            receipt.id,
        });

        await writeAuditLog({
          db: tx,

          actorUserId:
            user.id,

          actorRole:
            user.role,

          ...getRequestAuditMeta(request),

          action:
            "PRODUCT_COST_HISTORY_CREATE",

          entityType:
            "ProductCostHistory",

          entityId:
            null,

          description:
            `Product cost history created from Purchase ${purchase.purchaseNumber}.`,

          newValues: {
            rows:
              costHistoryRows,
          },

          referenceType:
            "Purchase",

          referenceId:
            purchase.id,
        });

        return {
          purchase,
          gstRecord,
          ledger,
        };
      });

    return NextResponse.json({
      success:
        true,

      purchase:
        result.purchase,

      gstRecord:
        result.gstRecord,

      ledger:
        result.ledger,
    });

  } catch (error) {

    console.error(
      "GRN -> Purchase conversion error:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to convert GRN to Purchase.",
      },
      {
        status:
          500,
      }
    );
  }
}