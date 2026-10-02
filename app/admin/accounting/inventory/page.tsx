"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  purchasePrice: number;
  sellingPrice: number;
  purchaseCostPaise: number;
  stockValuePaise: number;
  soldQuantity: number;
  salesValuePaise: number;
  cogsPaise: number;
  grossProfitPaise: number;
  grossMarginPercent: number;
  lowStock: boolean;
};

type InventoryResponse = {
  success: boolean;
  valuationMethod?: string;
  note?: string;
  summary?: {
    productCount: number;
    totalStockQuantity: number;
    totalSoldQuantity: number;
    totalStockValuePaise: number;
    totalSalesValuePaise: number;
    totalCogsPaise: number;
    totalGrossProfitPaise: number;
    grossMarginPercent: number;
    lowStockCount: number;
  };
  products?: ProductRow[];
  error?: string;
};

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);

const number = (value: number) =>
  new Intl.NumberFormat("en-IN").format(value);

export default function InventoryAccountingPage() {
  const [products, setProducts] =
    useState<ProductRow[]>([]);

  const [summary, setSummary] =
    useState<InventoryResponse["summary"]>();

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("ALL");

  const [stockFilter, setStockFilter] =
    useState("ALL");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/accounting/inventory",
        {
          cache: "no-store",
        }
      );

      const data =
        (await response.json()) as InventoryResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to load inventory accounting."
        );
      }

      setProducts(
        Array.isArray(data.products)
          ? data.products
          : []
      );

      setSummary(data.summary);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load inventory accounting."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map(
              (product) =>
                product.category
            )
            .filter(Boolean)
        )
      ).sort(),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        [
          product.name,
          product.sku,
          product.category,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesCategory =
        category === "ALL" ||
        product.category === category;

      const matchesStock =
        stockFilter === "ALL" ||
        (stockFilter === "LOW" &&
          product.lowStock) ||
        (stockFilter === "AVAILABLE" &&
          product.stock > 0) ||
        (stockFilter === "OUT" &&
          product.stock <= 0);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStock
      );
    });
  }, [
    products,
    search,
    category,
    stockFilter,
  ]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            Loading inventory accounting...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 print:bg-white">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
              Inventory Accounting
            </p>

            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
              Inventory Valuation & COGS
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Stock value, estimated cost of goods sold
              and product profitability control.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">

            <Link
              href="/admin/products"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Products
            </Link>

            <Link
              href="/admin/accounting/management"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Management
            </Link>

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
            >
              Print / Save PDF
            </button>

          </div>

        </section>

        {/* ERROR */}

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
            {error}

            <button
              type="button"
              onClick={loadData}
              className="ml-4 rounded-lg bg-red-700 px-3 py-2 text-white"
            >
              Retry
            </button>
          </section>
        )}

        {/* ACCOUNTING NOTICE */}

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">

          <p className="text-sm font-bold text-amber-900">
            Valuation Method
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            Current management valuation uses each product's
            current purchase price multiplied by current stock.
            Estimated COGS uses the same current purchase price
            against quantities sold. This is deliberately shown
            as a management valuation and should not be treated
            as a historical FIFO, LIFO or weighted-average
            statutory inventory ledger.
          </p>

        </section>

        {/* SUMMARY */}

        {summary && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">
                Current Stock Value
              </p>

              <p className="mt-2 text-3xl font-extrabold">
                {money(
                  summary.totalStockValuePaise
                )}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                {number(
                  summary.totalStockQuantity
                )}{" "}
                units
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">
                Sales Value
              </p>

              <p className="mt-2 text-3xl font-extrabold text-blue-700">
                {money(
                  summary.totalSalesValuePaise
                )}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                {number(
                  summary.totalSoldQuantity
                )}{" "}
                units sold
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">
                Estimated COGS
              </p>

              <p className="mt-2 text-3xl font-extrabold text-orange-700">
                {money(
                  summary.totalCogsPaise
                )}
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">
                Gross Profit
              </p>

              <p className="mt-2 text-3xl font-extrabold text-emerald-700">
                {money(
                  summary.totalGrossProfitPaise
                )}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Margin{" "}
                {summary.grossMarginPercent.toFixed(
                  2
                )}
                %
              </p>
            </div>

          </section>
        )}

        {/* SECONDARY SUMMARY */}

        {summary && (
          <section className="grid gap-4 md:grid-cols-3">

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">
                Product Count
              </p>

              <p className="mt-2 text-2xl font-extrabold">
                {number(
                  summary.productCount
                )}
              </p>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">
                Low Stock Products
              </p>

              <p className="mt-2 text-2xl font-extrabold text-orange-700">
                {number(
                  summary.lowStockCount
                )}
              </p>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">
                Stock Coverage
              </p>

              <p className="mt-2 text-2xl font-extrabold">
                {summary.totalSalesValuePaise > 0
                  ? (
                      summary.totalStockValuePaise /
                      summary.totalSalesValuePaise
                    ).toFixed(2)
                  : "0.00"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Stock value / recorded sales value
              </p>
            </div>

          </section>
        )}

        {/* FILTERS */}

        <section className="rounded-3xl bg-white p-6 shadow-sm">

          <div className="grid gap-4 md:grid-cols-3">

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search product, SKU, category..."
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="ALL">
                All Categories
              </option>

              {categories.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>

            <select
              value={stockFilter}
              onChange={(event) =>
                setStockFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="ALL">
                All Stock
              </option>

              <option value="AVAILABLE">
                Available
              </option>

              <option value="LOW">
                Low Stock
              </option>

              <option value="OUT">
                Out of Stock
              </option>
            </select>

          </div>

        </section>

        {/* PRODUCT PROFITABILITY */}

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="text-xl font-extrabold">
                Product Stock & Profitability
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {number(
                  filteredProducts.length
                )}{" "}
                product(s) displayed
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-50"
            >
              Refresh
            </button>

          </div>

          <div className="overflow-x-auto">

            <table className="min-w-full text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                <tr>
                  <th className="px-5 py-4">
                    Product
                  </th>

                  <th className="px-5 py-4">
                    Stock
                  </th>

                  <th className="px-5 py-4">
                    Purchase Cost
                  </th>

                  <th className="px-5 py-4">
                    Stock Value
                  </th>

                  <th className="px-5 py-4">
                    Sold
                  </th>

                  <th className="px-5 py-4">
                    Sales
                  </th>

                  <th className="px-5 py-4">
                    COGS
                  </th>

                  <th className="px-5 py-4">
                    Gross Profit
                  </th>

                  <th className="px-5 py-4">
                    Margin
                  </th>
                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(
                    (product) => (
                      <tr
                        key={product.id}
                        className="hover:bg-slate-50"
                      >

                        <td className="px-5 py-4">

                          <div className="font-bold text-slate-900">
                            {product.name}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            SKU: {product.sku}
                          </div>

                          <div className="text-xs text-slate-400">
                            {product.category}
                          </div>

                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={
                              product.stock <= 0
                                ? "font-bold text-red-700"
                                : product.lowStock
                                  ? "font-bold text-orange-700"
                                  : "font-bold text-slate-900"
                            }
                          >
                            {number(
                              product.stock
                            )}
                          </span>

                        </td>

                        <td className="px-5 py-4">
                          {money(
                            product.purchaseCostPaise
                          )}
                        </td>

                        <td className="px-5 py-4 font-bold">
                          {money(
                            product.stockValuePaise
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {number(
                            product.soldQuantity
                          )}
                        </td>

                        <td className="px-5 py-4 font-bold">
                          {money(
                            product.salesValuePaise
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {money(
                            product.cogsPaise
                          )}
                        </td>

                        <td
                          className={
                            product.grossProfitPaise >=
                            0
                              ? "px-5 py-4 font-extrabold text-emerald-700"
                              : "px-5 py-4 font-extrabold text-red-700"
                          }
                        >
                          {money(
                            product.grossProfitPaise
                          )}
                        </td>

                        <td className="px-5 py-4 font-bold">
                          {product.grossMarginPercent.toFixed(
                            2
                          )}
                          %
                        </td>

                      </tr>
                    )
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* CONTROL NOTES */}

        <section className="rounded-3xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-extrabold">
            Inventory Accounting Controls
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl bg-slate-50 p-5">

              <p className="font-bold">
                Stock Traceability
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Physical stock changes remain connected
                to the existing product and stock-movement
                architecture.
              </p>

            </div>

            <div className="rounded-2xl bg-slate-50 p-5">

              <p className="font-bold">
                Cost Transparency
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                The dashboard explicitly identifies the
                valuation method instead of presenting an
                unsupported statutory cost figure.
              </p>

            </div>

            <div className="rounded-2xl bg-slate-50 p-5">

              <p className="font-bold">
                Audit Visibility
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Viewing this control dashboard creates an
                inventory valuation view audit event.
              </p>

            </div>

          </div>

        </section>

        {/* PROFITABILITY INTERPRETATION */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6">

          <h2 className="text-lg font-extrabold">
            Management Interpretation
          </h2>

          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">

            <p>
              <strong>Stock Value</strong> represents current
              quantity multiplied by the product's current
              purchase price.
            </p>

            <p>
              <strong>Estimated COGS</strong> represents recorded
              sold quantity multiplied by that same current
              purchase price.
            </p>

            <p>
              <strong>Gross Profit</strong> is sales value minus
              estimated COGS and should be treated as a management
              indicator until historical inventory-cost accounting
              is implemented.
            </p>

          </div>

        </section>

      </div>
    </main>
  );
}