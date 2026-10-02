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

    const url = new URL(request.url);

    const search =
      url.searchParams.get("search")?.trim() || "";

    const productId =
      url.searchParams.get("productId") || "";

    const supplierId =
      url.searchParams.get("supplierId") || "";

    const rows =
      await prisma.productCostHistory.findMany({
        orderBy: [
          {
            effectiveAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

    const products =
      await prisma.product.findMany({
        select: {
          id: true,
          name: true,
          sku: true,
          category: true,
        },
      });

    const suppliers =
      await prisma.supplier.findMany({
        select: {
          id: true,
          name: true,
          phone: true,
          gstin: true,
        },
      });

    const productMap = new Map(
      products.map((product) => [
        product.id,
        product,
      ])
    );

    const supplierMap = new Map(
      suppliers.map((supplier) => [
        supplier.id,
        supplier,
      ])
    );

    const result = rows
      .map((row) => {
        const product =
          productMap.get(row.productId);

        const supplier =
          row.supplierId
            ? supplierMap.get(row.supplierId)
            : null;

        return {
          id: row.id,

          productId: row.productId,

          productName:
            product?.name || "Unknown Product",

          sku:
            product?.sku || "—",

          category:
            product?.category || "—",

          supplierId:
            row.supplierId,

          supplierName:
            supplier?.name || "—",

          purchaseId:
            row.purchaseId,

          purchaseNumber:
            row.purchaseNumber || "—",

          previousUnitCostPaise:
            row.previousUnitCostPaise,

          newUnitCostPaise:
            row.newUnitCostPaise,

          quantity:
            row.quantity,

          reason:
            row.reason,

          effectiveAt:
            row.effectiveAt,

          createdAt:
            row.createdAt,
        };
      })
      .filter((row) => {
        const query =
          search.toLowerCase();

        const matchesSearch =
          !query ||
          [
            row.productName,
            row.sku,
            row.category,
            row.supplierName,
            row.purchaseNumber,
            row.reason,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);

        const matchesProduct =
          !productId ||
          row.productId === productId;

        const matchesSupplier =
          !supplierId ||
          row.supplierId === supplierId;

        return (
          matchesSearch &&
          matchesProduct &&
          matchesSupplier
        );
      });

    const totalRecords =
      result.length;

    const totalQuantity =
      result.reduce(
        (sum, row) =>
          sum + row.quantity,
        0
      );

    const latestCostChanges =
      result.filter(
        (row) =>
          row.previousUnitCostPaise !==
          row.newUnitCostPaise
      ).length;

    await writeAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      ...getRequestAuditMeta(request),
      action: "PRODUCT_COST_HISTORY_VIEW",
      entityType: "ProductCostHistory",
      entityId: null,
      description:
        "Viewed product and supplier cost history.",
    });

    return NextResponse.json({
      success: true,

      summary: {
        totalRecords,
        totalQuantity,
        latestCostChanges,
      },

      products,

      suppliers,

      history: result,
    });
  } catch (error) {
    console.error(
      "Cost history GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load cost history.",
      },
      {
        status: 500,
      }
    );
  }
}