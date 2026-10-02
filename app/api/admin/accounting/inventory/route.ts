import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireCurrentAdminUser,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentAdminUser();

    const products = await prisma.product.findMany({
      orderBy: {
        name: "asc",
      },
    });

    const orderItems = await prisma.orderItem.findMany({
      include: {
        order: true,
        product: true,
      },
    });

    const rows = products.map((product) => {
      const soldItems = orderItems.filter(
        (item) =>
          item.productId === product.id &&
          item.order.orderStatus !== "CANCELLED"
      );

      const soldQuantity = soldItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      const salesValuePaise = soldItems.reduce(
        (sum, item) =>
          sum +
          Math.round(
            Number(item.unitPrice) *
              item.quantity *
              100
          ),
        0
      );

      const purchaseCostPaise = Math.round(
        Number(product.purchasePrice) * 100
      );

      const stockValuePaise =
        purchaseCostPaise *
        product.stock;

      const cogsPaise =
        purchaseCostPaise *
        soldQuantity;

      const grossProfitPaise =
        salesValuePaise -
        cogsPaise;

      const grossMarginPercent =
        salesValuePaise > 0
          ? (grossProfitPaise /
              salesValuePaise) *
            100
          : 0;

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        stock: product.stock,
        purchasePrice: Number(
          product.purchasePrice
        ),
        sellingPrice: Number(
          product.sellingPrice
        ),
        purchaseCostPaise,
        stockValuePaise,
        soldQuantity,
        salesValuePaise,
        cogsPaise,
        grossProfitPaise,
        grossMarginPercent,
        lowStock:
          product.stock <= 10,
      };
    });

    const totalStockValuePaise =
      rows.reduce(
        (sum, row) =>
          sum + row.stockValuePaise,
        0
      );

    const totalSalesValuePaise =
      rows.reduce(
        (sum, row) =>
          sum + row.salesValuePaise,
        0
      );

    const totalCogsPaise =
      rows.reduce(
        (sum, row) =>
          sum + row.cogsPaise,
        0
      );

    const totalGrossProfitPaise =
      totalSalesValuePaise -
      totalCogsPaise;

    const totalStockQuantity =
      rows.reduce(
        (sum, row) =>
          sum + row.stock,
        0
      );

    const totalSoldQuantity =
      rows.reduce(
        (sum, row) =>
          sum + row.soldQuantity,
        0
      );

    const grossMarginPercent =
      totalSalesValuePaise > 0
        ? (totalGrossProfitPaise /
            totalSalesValuePaise) *
          100
        : 0;

    const lowStockCount =
      rows.filter(
        (row) => row.lowStock
      ).length;

    await writeAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      ...getRequestAuditMeta(request),
      action: "INVENTORY_VALUATION_VIEW",
      entityType: "Product",
      entityId: null,
      description:
        "Viewed inventory valuation and COGS control dashboard.",
    });

    return NextResponse.json({
      success: true,

      valuationMethod:
        "CURRENT_PRODUCT_PURCHASE_PRICE",

      note:
        "Stock value and estimated COGS use the current Product.purchasePrice. This is an internal management valuation and not a historical FIFO/LIFO/weighted-average cost ledger.",

      summary: {
        productCount: rows.length,
        totalStockQuantity,
        totalSoldQuantity,
        totalStockValuePaise,
        totalSalesValuePaise,
        totalCogsPaise,
        totalGrossProfitPaise,
        grossMarginPercent,
        lowStockCount,
      },

      products: rows,
    });
  } catch (error) {
    console.error(
      "Inventory valuation GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load inventory valuation.",
      },
      {
        status: 500,
      }
    );
  }
}