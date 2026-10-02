"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  sku: string;
  category?: string;
};

type Supplier = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
};

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

type SupplierSummary = {
  supplierId: string;
  supplierName: string;
  productCount: number;
  purchaseCount: number;
  totalQuantity: number;
  totalValuePaise: number;
};

type ProductComparison = {
  productId: string;
  productName: string;
  sku: string;
  supplierCount: number;
  lowestAverageCostPaise: number;
  highestAverageCostPaise: number;
  priceSpreadPaise: number;
  suppliers: ComparisonRow[];
};

type ApiResponse = {
  success: boolean;
  comparison?: ComparisonRow[];
  supplierSummary?: SupplierSummary[];
  productComparison?: ProductComparison[];
  products?: Product[];
  suppliers?: Supplier[];
  summary?: {
    comparisonRecords: number;
    suppliersCovered: number;
    productsCovered: number;
    totalPurchaseValuePaise: number;
    totalQuantity: number;
  };
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

const dateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString(
        "en-IN",
        {
          dateStyle: "medium",
          timeStyle: "short",
        }
      )
    : "—";

export default function ProcurementAnalysisPage() {
  const [comparison, setComparison] =
    useState<ComparisonRow[]>([]);

  const [supplierSummary, setSupplierSummary] =
    useState<SupplierSummary[]>([]);

  const [productComparison, setProductComparison] =
    useState<ProductComparison[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [suppliers, setSuppliers] =
    useState<Supplier[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [supplierId, setSupplierId] =
    useState("ALL");

  const [productId, setProductId] =
    useState("ALL");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/accounting/procurement-analysis",
        {
          cache: "no-store",
        }
      );

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to load procurement analysis."
        );
      }

      setComparison(
        Array.isArray(data.comparison)
          ? data.comparison
          : []
      );

      setSupplierSummary(
        Array.isArray(data.supplierSummary)
          ? data.supplierSummary
          : []
      );

      setProductComparison(
        Array.isArray(data.productComparison)
          ? data.productComparison
          : []
      );

      setProducts(
        Array.isArray(data.products)
          ? data.products
          : []
      );

      setSuppliers(
        Array.isArray(data.suppliers)
          ? data.suppliers
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load procurement analysis."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return comparison.filter((row) => {
      const matchesSearch =
        !query ||
        [
          row.productName,
          row.sku,
          row.category,
          row.supplierName,
          row.latestPurchaseNumber,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesSupplier =
        supplierId === "ALL" ||
        row.supplierId === supplierId;

      const matchesProduct =
        productId === "ALL" ||
        row.productId === productId;

      return (
        matchesSearch &&
        matchesSupplier &&
        matchesProduct
      );
    });
  }, [
    comparison,
    search,
    supplierId,
    productId,
  ]);

  const filteredProducts =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return productComparison.filter(
        (row) =>
          !query ||
          [
            row.productName,
            row.sku,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
      );
    }, [
      productComparison,
      search,
    ]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 print:bg-white">

      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
              Procurement Control
            </p>

            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
              Supplier Performance & Price Comparison
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Compare historical purchase prices and supplier
              procurement volumes.
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <Link
              href="/admin/purchases"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Purchases
            </Link>

            <Link
              href="/admin/accounting/cost-history"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Cost History
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

        {/* NOTICE */}

        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5">

          <p className="text-sm font-bold text-blue-900">
            Procurement Analysis Notice
          </p>

          <p className="mt-2 text-sm leading-6 text-blue-800">
            This module compares recorded historical purchase
            transactions. It does not automatically select a
            supplier, place an order, or represent that the lowest
            recorded price is necessarily the best commercial option.
            Quality, delivery, credit terms, GST treatment and other
            procurement conditions must be reviewed separately.
          </p>

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

        {/* SUMMARY */}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-3xl bg-white p-6 shadow-sm">

            <p className="text-xs font-bold uppercase text-slate-400">
              Comparison Records
            </p>

            <p className="mt-2 text-3xl font-extrabold">
              {number(
                comparison.length
              )}
            </p>

          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">

            <p className="text-xs font-bold uppercase text-slate-400">
              Suppliers Covered
            </p>

            <p className="mt-2 text-3xl font-extrabold">
              {number(
                supplierSummary.length
              )}
            </p>

          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">

            <p className="text-xs font-bold uppercase text-slate-400">
              Products Compared
            </p>

            <p className="mt-2 text-3xl font-extrabold">
              {number(
                productComparison.length
              )}
            </p>

          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">

            <p className="text-xs font-bold uppercase text-slate-400">
              Recorded Purchase Value
            </p>

            <p className="mt-2 text-2xl font-extrabold text-blue-700">
              {money(
                comparison.reduce(
                  (sum, row) =>
                    sum +
                    row.totalValuePaise,
                  0
                )
              )}
            </p>

          </div>

        </section>

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
              placeholder="Search product, SKU, supplier..."
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={productId}
              onChange={(event) =>
                setProductId(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >

              <option value="ALL">
                All Products
              </option>

              {products.map(
                (product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name}
                    {" — "}
                    {product.sku}
                  </option>
                )
              )}

            </select>

            <select
              value={supplierId}
              onChange={(event) =>
                setSupplierId(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >

              <option value="ALL">
                All Suppliers
              </option>

              {suppliers.map(
                (supplier) => (
                  <option
                    key={supplier.id}
                    value={supplier.id}
                  >
                    {supplier.name}
                  </option>
                )
              )}

            </select>

          </div>

        </section>

        {/* PRODUCT COMPARISON */}

        <section className="rounded-3xl bg-white shadow-sm overflow-hidden">

          <div className="border-b border-slate-200 px-6 py-5">

            <h2 className="text-xl font-extrabold">
              Product-wise Supplier Price Comparison
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Historical average unit cost comparison.
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="min-w-full text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                <tr>

                  <th className="px-5 py-4">
                    Product
                  </th>

                  <th className="px-5 py-4">
                    Suppliers
                  </th>

                  <th className="px-5 py-4">
                    Lowest Avg.
                  </th>

                  <th className="px-5 py-4">
                    Highest Avg.
                  </th>

                  <th className="px-5 py-4">
                    Price Spread
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredProducts.map(
                  (row) => (

                    <tr
                      key={row.productId}
                      className="hover:bg-slate-50"
                    >

                      <td className="px-5 py-4">

                        <p className="font-bold">
                          {row.productName}
                        </p>

                        <p className="text-xs text-slate-500">
                          {row.sku}
                        </p>

                      </td>

                      <td className="px-5 py-4 font-bold">
                        {number(
                          row.supplierCount
                        )}
                      </td>

                      <td className="px-5 py-4 font-bold text-emerald-700">
                        {money(
                          row.lowestAverageCostPaise
                        )}
                      </td>

                      <td className="px-5 py-4 font-bold">
                        {money(
                          row.highestAverageCostPaise
                        )}
                      </td>

                      <td className="px-5 py-4 font-extrabold">
                        {money(
                          row.priceSpreadPaise
                        )}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* SUPPLIER SUMMARY */}

        <section className="rounded-3xl bg-white shadow-sm overflow-hidden">

          <div className="border-b border-slate-200 px-6 py-5">

            <h2 className="text-xl font-extrabold">
              Supplier Procurement Summary
            </h2>

          </div>

          <div className="overflow-x-auto">

            <table className="min-w-full text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                <tr>

                  <th className="px-5 py-4">
                    Supplier
                  </th>

                  <th className="px-5 py-4">
                    Products
                  </th>

                  <th className="px-5 py-4">
                    Purchases
                  </th>

                  <th className="px-5 py-4">
                    Quantity
                  </th>

                  <th className="px-5 py-4">
                    Purchase Value
                  </th>

                  <th className="px-5 py-4">
                    Ledger
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {supplierSummary.map(
                  (supplier) => (

                    <tr
                      key={supplier.supplierId}
                      className="hover:bg-slate-50"
                    >

                      <td className="px-5 py-4 font-bold">
                        {supplier.supplierName}
                      </td>

                      <td className="px-5 py-4">
                        {number(
                          supplier.productCount
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {number(
                          supplier.purchaseCount
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {number(
                          supplier.totalQuantity
                        )}
                      </td>

                      <td className="px-5 py-4 font-bold">
                        {money(
                          supplier.totalValuePaise
                        )}
                      </td>

                      <td className="px-5 py-4">

                        <Link
                          href={`/admin/suppliers/${supplier.supplierId}/ledger`}
                          className="font-bold text-blue-600 hover:underline"
                        >
                          View Ledger
                        </Link>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* DETAILED COMPARISON */}

        <section className="rounded-3xl bg-white shadow-sm overflow-hidden">

          <div className="border-b border-slate-200 px-6 py-5">

            <h2 className="text-xl font-extrabold">
              Detailed Supplier Price Register
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Historical price range and latest recorded purchase.
            </p>

          </div>

          {loading ? (

            <div className="p-10 text-center text-slate-500">
              Loading procurement analysis...
            </div>

          ) : filtered.length === 0 ? (

            <div className="p-10 text-center text-slate-500">
              No procurement records found.
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="min-w-full text-left text-sm">

                <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                  <tr>

                    <th className="px-5 py-4">
                      Product
                    </th>

                    <th className="px-5 py-4">
                      Supplier
                    </th>

                    <th className="px-5 py-4">
                      Purchases
                    </th>

                    <th className="px-5 py-4">
                      Quantity
                    </th>

                    <th className="px-5 py-4">
                      Average
                    </th>

                    <th className="px-5 py-4">
                      Lowest
                    </th>

                    <th className="px-5 py-4">
                      Highest
                    </th>

                    <th className="px-5 py-4">
                      Latest
                    </th>

                    <th className="px-5 py-4">
                      Last Purchase
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {filtered.map(
                    (row) => (

                      <tr
                        key={`${row.productId}-${row.supplierId}`}
                        className="hover:bg-slate-50"
                      >

                        <td className="px-5 py-4">

                          <p className="font-bold">
                            {row.productName}
                          </p>

                          <p className="text-xs text-slate-500">
                            {row.sku}
                          </p>

                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {row.supplierName}
                        </td>

                        <td className="px-5 py-4">
                          {number(
                            row.purchaseCount
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {number(
                            row.totalQuantity
                          )}
                        </td>

                        <td className="px-5 py-4 font-bold">
                          {money(
                            row.averageUnitCostPaise
                          )}
                        </td>

                        <td className="px-5 py-4 text-emerald-700 font-bold">
                          {money(
                            row.lowestUnitCostPaise
                          )}
                        </td>

                        <td className="px-5 py-4 text-red-700 font-bold">
                          {money(
                            row.highestUnitCostPaise
                          )}
                        </td>

                        <td className="px-5 py-4 font-extrabold text-blue-700">
                          {money(
                            row.latestUnitCostPaise
                          )}
                        </td>

                        <td className="px-5 py-4">

                          <p className="font-bold">
                            {row.latestPurchaseNumber}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {dateTime(
                              row.latestPurchaseDate
                            )}
                          </p>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

        {/* CONTROL NOTES */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6">

          <h2 className="text-lg font-extrabold">
            Procurement Controls
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl bg-slate-50 p-5">

              <p className="font-bold">
                Historical Evidence
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Comparison is based on recorded purchase
                transactions and their historical unit costs.
              </p>

            </div>

            <div className="rounded-2xl bg-slate-50 p-5">

              <p className="font-bold">
                Supplier Transparency
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Supplier purchase volume and product-level
                pricing remain separately visible.
              </p>

            </div>

            <div className="rounded-2xl bg-slate-50 p-5">

              <p className="font-bold">
                Audit Visibility
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Viewing procurement analysis creates an
                audit event without modifying purchase records.
              </p>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}