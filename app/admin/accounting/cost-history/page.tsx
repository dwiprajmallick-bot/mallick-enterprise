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
  gstin?: string | null;
};

type HistoryRow = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  supplierId?: string | null;
  supplierName: string;
  purchaseId?: string | null;
  purchaseNumber: string;
  previousUnitCostPaise: number;
  newUnitCostPaise: number;
  quantity: number;
  reason: string;
  effectiveAt: string;
  createdAt: string;
};

type ApiResponse = {
  success: boolean;
  summary?: {
    totalRecords: number;
    totalQuantity: number;
    latestCostChanges: number;
  };
  products?: Product[];
  suppliers?: Supplier[];
  history?: HistoryRow[];
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

const dateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function CostHistoryPage() {
  const [history, setHistory] =
    useState<HistoryRow[]>([]);

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

  const [productId, setProductId] =
    useState("ALL");

  const [supplierId, setSupplierId] =
    useState("ALL");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/accounting/cost-history",
        {
          cache: "no-store",
        }
      );

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to load cost history."
        );
      }

      setHistory(
        Array.isArray(data.history)
          ? data.history
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
          : "Failed to load cost history."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredHistory =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return history.filter((row) => {
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
          productId === "ALL" ||
          row.productId === productId;

        const matchesSupplier =
          supplierId === "ALL" ||
          row.supplierId === supplierId;

        return (
          matchesSearch &&
          matchesProduct &&
          matchesSupplier
        );
      });
    }, [
      history,
      search,
      productId,
      supplierId,
    ]);

  const totals = useMemo(() => {
    const quantity =
      filteredHistory.reduce(
        (sum, row) =>
          sum + row.quantity,
        0
      );

    const oldCost =
      filteredHistory.reduce(
        (sum, row) =>
          sum +
          row.previousUnitCostPaise *
            row.quantity,
        0
      );

    const newCost =
      filteredHistory.reduce(
        (sum, row) =>
          sum +
          row.newUnitCostPaise *
            row.quantity,
        0
      );

    return {
      quantity,
      oldCost,
      newCost,
      difference:
        newCost - oldCost,
    };
  }, [filteredHistory]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 print:bg-white">

      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
              Procurement Accounting
            </p>

            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
              Product Cost History
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Historical product purchase-cost and supplier-price
              control.
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
              href="/admin/accounting/inventory"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Inventory
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

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">

          <p className="text-sm font-bold text-amber-900">
            Cost History Control
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            This register preserves historical cost observations.
            It does not rewrite previous purchase costs and does not
            itself determine FIFO, weighted-average or statutory
            inventory valuation.
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
              History Records
            </p>

            <p className="mt-2 text-3xl font-extrabold">
              {number(
                filteredHistory.length
              )}
            </p>

          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">

            <p className="text-xs font-bold uppercase text-slate-400">
              Quantity Covered
            </p>

            <p className="mt-2 text-3xl font-extrabold">
              {number(
                totals.quantity
              )}
            </p>

          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">

            <p className="text-xs font-bold uppercase text-slate-400">
              Historical Cost
            </p>

            <p className="mt-2 text-2xl font-extrabold">
              {money(
                totals.oldCost
              )}
            </p>

          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">

            <p className="text-xs font-bold uppercase text-slate-400">
              Current Recorded Cost
            </p>

            <p className="mt-2 text-2xl font-extrabold text-blue-700">
              {money(
                totals.newCost
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
              placeholder="Search product, supplier, purchase..."
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

        {/* REGISTER */}

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">

            <div className="flex items-center justify-between gap-4">

              <div>

                <h2 className="text-xl font-extrabold">
                  Supplier / Product Cost Register
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {number(
                    filteredHistory.length
                  )}{" "}
                  record(s)
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

          </div>

          {loading ? (

            <div className="p-10 text-center text-slate-500">
              Loading cost history...
            </div>

          ) : filteredHistory.length === 0 ? (

            <div className="p-10 text-center text-slate-500">
              No cost history records found.
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
                      Purchase
                    </th>

                    <th className="px-5 py-4">
                      Qty
                    </th>

                    <th className="px-5 py-4">
                      Previous Cost
                    </th>

                    <th className="px-5 py-4">
                      New Cost
                    </th>

                    <th className="px-5 py-4">
                      Difference
                    </th>

                    <th className="px-5 py-4">
                      Reason
                    </th>

                    <th className="px-5 py-4">
                      Effective
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {filteredHistory.map(
                    (row) => {

                      const difference =
                        row.newUnitCostPaise -
                        row.previousUnitCostPaise;

                      return (

                        <tr
                          key={row.id}
                          className="hover:bg-slate-50"
                        >

                          <td className="px-5 py-4">

                            <p className="font-bold text-slate-900">
                              {row.productName}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              SKU: {row.sku}
                            </p>

                            <p className="text-xs text-slate-400">
                              {row.category}
                            </p>

                          </td>

                          <td className="px-5 py-4 font-semibold">
                            {row.supplierName}
                          </td>

                          <td className="px-5 py-4">

                            {row.purchaseId ? (
                              <Link
                                href={`/admin/purchases/${row.purchaseId}`}
                                className="font-bold text-blue-600 hover:underline"
                              >
                                {row.purchaseNumber}
                              </Link>
                            ) : (
                              row.purchaseNumber
                            )}

                          </td>

                          <td className="px-5 py-4">
                            {number(
                              row.quantity
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {money(
                              row.previousUnitCostPaise
                            )}
                          </td>

                          <td className="px-5 py-4 font-bold">
                            {money(
                              row.newUnitCostPaise
                            )}
                          </td>

                          <td
                            className={
                              difference > 0
                                ? "px-5 py-4 font-extrabold text-red-700"
                                : difference < 0
                                  ? "px-5 py-4 font-extrabold text-emerald-700"
                                  : "px-5 py-4 font-bold text-slate-500"
                            }
                          >
                            {difference > 0
                              ? "+"
                              : ""}
                            {money(
                              difference
                            )}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {row.reason}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                            {dateTime(
                              row.effectiveAt
                            )}
                          </td>

                        </tr>

                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

        {/* FUTURE COSTING FOUNDATION */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6">

          <h2 className="text-lg font-extrabold">
            Future Costing Foundation
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-4">

            <div className="rounded-2xl bg-slate-50 p-4">

              <p className="font-bold">
                Purchase History
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Historical purchase references remain identifiable.
              </p>

            </div>

            <div className="rounded-2xl bg-slate-50 p-4">

              <p className="font-bold">
                Supplier History
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Supplier-specific cost observations can be compared.
              </p>

            </div>

            <div className="rounded-2xl bg-slate-50 p-4">

              <p className="font-bold">
                Cost Changes
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Previous and new unit costs are retained separately.
              </p>

            </div>

            <div className="rounded-2xl bg-slate-50 p-4">

              <p className="font-bold">
                Audit Trail
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Viewing the history is recorded in the audit system.
              </p>

            </div>

          </div>

        </section>

      </div>
    </main>
  );
}