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
      url.searchParams.get("search")?.trim().toLowerCase() || "";

    const supplierId =
      url.searchParams.get("supplierId") || "";

    const productId =
      url.searchParams.get("productId") || "";

    const purchases = await prisma.purchase.findMany({
      include: {
        items: true,
        supplier: true,
      },
      orderBy: {
        purchasedAt: "desc",
      },
    });

    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
      },
    });

    const suppliers = await prisma.supplier.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        gstin: true,
      },
    });

    const productMap = new Map(
      products.map((product) => [product.id, product])
    );

    const supplierMap = new Map(
      suppliers.map((supplier) => [supplier.id, supplier])
    );

    type ComparisonRow = {
      productId: string;
      productName: string;
      sku: string;
      category: string;
      supplierId: string;
      supplierName: string;
      purchaseCount: number;
      totalQuantity: number;
      totalValuePaise: number;
      averageUnitCostPaise: number;
      lowestUnitCostPaise: number;
      highestUnitCostPaise: number;
      latestUnitCostPaise: number;
      latestPurchaseNumber: string;
      latestPurchaseDate: string | null;
    };

    const grouped = new Map<string, {
      productId: string;
      supplierId: string;
      purchaseCount: number;
      totalQuantity: number;
      totalValuePaise: number;
      costs: number[];
      latestUnitCostPaise: number;
      latestPurchaseNumber: string;
      latestPurchaseDate: Date | null;
    }>();

    for (const purchase of purchases) {
      if (purchase.status === "CANCELLED") {
        continue;
      }

      for (const item of purchase.items) {
        const key =
          `${item.productId}__${purchase.supplierId}`;

        const unitCostPaise =
          Math.round(
            Number(item.unitCost) * 100
          );

        const quantity =
          Number(item.quantity);

        const valuePaise =
          unitCostPaise * quantity;

        const existing =
          grouped.get(key);

        if (!existing) {
          grouped.set(key, {
            productId: item.productId,
            supplierId: purchase.supplierId,
            purchaseCount: 1,
            totalQuantity: quantity,
            totalValuePaise: valuePaise,
            costs: [unitCostPaise],
            latestUnitCostPaise: unitCostPaise,
            latestPurchaseNumber: purchase.purchaseNumber,
            latestPurchaseDate: purchase.purchasedAt,
          });
        } else {
          existing.purchaseCount += 1;
          existing.totalQuantity += quantity;
          existing.totalValuePaise += valuePaise;
          existing.costs.push(unitCostPaise);

          if (
            !existing.latestPurchaseDate ||
            purchase.purchasedAt >
              existing.latestPurchaseDate
          ) {
            existing.latestUnitCostPaise =
              unitCostPaise;

            existing.latestPurchaseNumber =
              purchase.purchaseNumber;

            existing.latestPurchaseDate =
              purchase.purchasedAt;
          }
        }
      }
    }

    const comparison: ComparisonRow[] =
      Array.from(grouped.values())
        .map((row) => {
          const product =
            productMap.get(row.productId);

          const supplier =
            supplierMap.get(row.supplierId);

          const averageUnitCostPaise =
            row.totalQuantity > 0
              ? Math.round(
                  row.totalValuePaise /
                    row.totalQuantity
                )
              : 0;

          return {
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
              supplier?.name || "Unknown Supplier",

            purchaseCount:
              row.purchaseCount,

            totalQuantity:
              row.totalQuantity,

            totalValuePaise:
              row.totalValuePaise,

            averageUnitCostPaise,

            lowestUnitCostPaise:
              Math.min(...row.costs),

            highestUnitCostPaise:
              Math.max(...row.costs),

            latestUnitCostPaise:
              row.latestUnitCostPaise,

            latestPurchaseNumber:
              row.latestPurchaseNumber,

            latestPurchaseDate:
              row.latestPurchaseDate
                ? row.latestPurchaseDate.toISOString()
                : null,
          };
        })
        .filter((row) => {
          const matchesSearch =
            !search ||
            [
              row.productName,
              row.sku,
              row.category,
              row.supplierName,
              row.latestPurchaseNumber,
            ]
              .join(" ")
              .toLowerCase()
              .includes(search);

          const matchesSupplier =
            !supplierId ||
            row.supplierId === supplierId;

          const matchesProduct =
            !productId ||
            row.productId === productId;

          return (
            matchesSearch &&
            matchesSupplier &&
            matchesProduct
          );
        });

    const supplierSummaryMap = new Map<
      string,
      {
        supplierId: string;
        supplierName: string;
        productCount: number;
        purchaseCount: number;
        totalQuantity: number;
        totalValuePaise: number;
      }
    >();

    for (const row of comparison) {
      const existing =
        supplierSummaryMap.get(
          row.supplierId
        );

      if (!existing) {
        supplierSummaryMap.set(
          row.supplierId,
          {
            supplierId: row.supplierId,
            supplierName: row.supplierName,
            productCount: 1,
            purchaseCount: row.purchaseCount,
            totalQuantity: row.totalQuantity,
            totalValuePaise: row.totalValuePaise,
          }
        );
      } else {
        existing.productCount += 1;
        existing.purchaseCount +=
          row.purchaseCount;
        existing.totalQuantity +=
          row.totalQuantity;
        existing.totalValuePaise +=
          row.totalValuePaise;
      }
    }

    const supplierSummary =
      Array.from(
        supplierSummaryMap.values()
      ).sort(
        (a, b) =>
          b.totalValuePaise -
          a.totalValuePaise
      );

    const productComparisonMap =
      new Map<string, ComparisonRow[]>();

    for (const row of comparison) {
      const existing =
        productComparisonMap.get(
          row.productId
        ) || [];

      existing.push(row);

      productComparisonMap.set(
        row.productId,
        existing
      );
    }

    const productComparison =
      Array.from(
        productComparisonMap.entries()
      ).map(
        ([productId, rows]) => {
          const sorted =
            [...rows].sort(
              (a, b) =>
                a.averageUnitCostPaise -
                b.averageUnitCostPaise
            );

          const lowest =
            sorted[0];

          const highest =
            sorted[sorted.length - 1];

          return {
            productId,
            productName:
              lowest.productName,
            sku:
              lowest.sku,
            supplierCount:
              rows.length,
            lowestAverageCostPaise:
              lowest.averageUnitCostPaise,
            highestAverageCostPaise:
              highest.averageUnitCostPaise,
            priceSpreadPaise:
              highest.averageUnitCostPaise -
              lowest.averageUnitCostPaise,
            suppliers: sorted,
          };
        }
      );

    await writeAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      ...getRequestAuditMeta(request),
      action: "PROCUREMENT_ANALYSIS_VIEW",
      entityType: "Purchase",
      entityId: null,
      description:
        "Viewed supplier performance and purchase price comparison.",
    });

    return NextResponse.json({
      success: true,

      comparison,

      supplierSummary,

      productComparison,

      products,

      suppliers,

      summary: {
        comparisonRecords:
          comparison.length,

        suppliersCovered:
          supplierSummary.length,

        productsCovered:
          productComparison.length,

        totalPurchaseValuePaise:
          comparison.reduce(
            (sum, row) =>
              sum + row.totalValuePaise,
            0
          ),

        totalQuantity:
          comparison.reduce(
            (sum, row) =>
              sum + row.totalQuantity,
            0
          ),
      },
    });
  } catch (error) {
    console.error(
      "Procurement analysis GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load procurement analysis.",
      },
      {
        status: 500,
      }
    );
  }
}