"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type GRNItem = {
  id: string;
  orderedQty?: number | null;
  alreadyReceived?: number | null;
  remainingQty?: number | null;
  receiveNow?: number | null;
};

type GRN = {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  receivedDate?: string | null;
  status: "DRAFT" | "POSTED" | "CANCELLED" | string;
  notes?: string | null;
  createdAt?: string | null;
  postedAt?: string | null;
  items: GRNItem[];
  receivedTotal?: number;
  orderedTotal?: number;
  itemCount?: number;
  purchaseOrder?: {
    id: string;
    poNumber?: string | null;
    status?: string | null;
    orderDate?: string | null;
  } | null;
};

export default function GoodsReceiptsPage() {
  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  async function loadGRNs() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/goods-receipts",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to load Goods Receipts."
        );
      }

      setGrns(data.goodsReceipts || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Goods Receipts."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGRNs();
  }, []);

  const filteredGRNs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return grns.filter((grn) => {
      const matchesStatus =
        status === "ALL" ||
        grn.status === status;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        grn.grnNumber,
        grn.purchaseOrder?.poNumber,
        grn.purchaseOrderId,
        grn.status,
        grn.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [grns, search, status]);

  const draftCount =
    grns.filter(
      (grn) => grn.status === "DRAFT"
    ).length;

  const postedCount =
    grns.filter(
      (grn) => grn.status === "POSTED"
    ).length;

  const cancelledCount =
    grns.filter(
      (grn) => grn.status === "CANCELLED"
    ).length;

  function formatDate(value?: string | null) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function statusClass(value: string) {
    if (value === "POSTED") {
      return "bg-green-100 text-green-700";
    }

    if (value === "CANCELLED") {
      return "bg-red-100 text-red-700";
    }

    return "bg-orange-100 text-orange-700";
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-7">
          <p className="text-sm font-extrabold uppercase tracking-wider text-blue-600">
            দ্বীবরাজ মল্লিক · OfficeKart
          </p>

          <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">
                Goods Receipts
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Manage GRN drafts, posted receipts and
                cancelled receiving documents.
              </p>
            </div>

            <Link
              href="/admin/purchase-orders"
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
            >
              Purchase Orders
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Total GRNs
            </p>

            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {grns.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Draft
            </p>

            <p className="mt-2 text-3xl font-extrabold text-orange-600">
              {draftCount}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Posted
            </p>

            <p className="mt-2 text-3xl font-extrabold text-green-600">
              {postedCount}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Cancelled
            </p>

            <p className="mt-2 text-3xl font-extrabold text-red-600">
              {cancelledCount}
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div>
              <label className="text-sm font-extrabold text-slate-700">
                Search GRN / Purchase Order
              </label>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search GRN number, PO number..."
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-extrabold text-slate-700">
                Status
              </label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
              >
                <option value="ALL">
                  All Status
                </option>
                <option value="DRAFT">
                  Draft
                </option>
                <option value="POSTED">
                  Posted
                </option>
                <option value="CANCELLED">
                  Cancelled
                </option>
              </select>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  GRN Register
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Showing {filteredGRNs.length} of{" "}
                  {grns.length} GRNs
                </p>
              </div>

              <button
                type="button"
                onClick={loadGRNs}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <p className="font-semibold text-slate-500">
                Loading Goods Receipts...
              </p>
            </div>
          ) : filteredGRNs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-lg font-extrabold text-slate-700">
                No GRNs found
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Create a GRN from a Purchase Order.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-5 py-4 text-xs font-extrabold uppercase text-slate-500">
                      GRN
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold uppercase text-slate-500">
                      Purchase Order
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold uppercase text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-extrabold uppercase text-slate-500">
                      Items
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-extrabold uppercase text-slate-500">
                      Received
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold uppercase text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-extrabold uppercase text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredGRNs.map((grn) => (
                    <tr
                      key={grn.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-5">
                        <p className="font-extrabold text-slate-900">
                          {grn.grnNumber}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {grn.id}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <Link
                          href={`/admin/purchase-orders/${grn.purchaseOrderId}`}
                          className="font-bold text-blue-600 hover:text-blue-800"
                        >
                          {grn.purchaseOrder?.poNumber ||
                            grn.purchaseOrderId}
                        </Link>
                      </td>

                      <td className="px-5 py-5 text-sm font-semibold text-slate-600">
                        {formatDate(
                          grn.receivedDate ||
                            grn.createdAt
                        )}
                      </td>

                      <td className="px-5 py-5 text-right font-bold text-slate-700">
                        {grn.itemCount ??
                          grn.items?.length ??
                          0}
                      </td>

                      <td className="px-5 py-5 text-right font-extrabold text-blue-600">
                        {grn.receivedTotal ?? 0}
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${statusClass(
                            grn.status
                          )}`}
                        >
                          {grn.status}
                        </span>
                      </td>

                      <td className="px-5 py-5 text-right">
                        <Link
                          href={`/admin/goods-receipts/${grn.id}`}
                          className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-700"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-lg font-extrabold text-blue-900">
            GRN Workflow
          </h2>

          <p className="mt-2 text-sm leading-6 text-blue-800">
            Purchase Order → GRN Draft → Receive Now →
            Save → POST → Purchase Conversion → Stock IN
          </p>
        </section>
      </div>
    </main>
  );
}
