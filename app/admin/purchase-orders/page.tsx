"use client";


import CreateGRNButton from "@/components/admin/CreateGRNButton";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Supplier = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
};

type PurchaseOrder = {
  id: string;
  poNumber: string;
  supplierId: string;
  status: string;
  subtotalPaise: number;
  gstPaise: number;
  deliveryPaise: number;
  totalPaise: number;
  notes?: string | null;
  requestedAt: string;
  approvedAt?: string | null;
  issuedAt?: string | null;
  acknowledgedAt?: string | null;
  partiallyReceivedAt?: string | null;
  receivedAt?: string | null;
  closedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  supplier?: Supplier | null;
};

type ApiResponse = {
  success: boolean;
  purchaseOrders?: PurchaseOrder[];
  suppliers?: Supplier[];
  error?: string;
};

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);

const dateTime = (value: string) =>
  new Date(value).toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );

function statusClass(status: string) {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700";

    case "APPROVED":
      return "bg-blue-100 text-blue-700";

    case "ISSUED":
      return "bg-indigo-100 text-indigo-700";

    case "ACKNOWLEDGED":
      return "bg-purple-100 text-purple-700";

    case "PARTIALLY_RECEIVED":
      return "bg-amber-100 text-amber-700";

    case "RECEIVED":
      return "bg-emerald-100 text-emerald-700";

    case "CLOSED":
      return "bg-green-100 text-green-800";

    case "CANCELLED":
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] =
    useState<PurchaseOrder[]>([]);

  const [suppliers, setSuppliers] =
    useState<Supplier[]>([]);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("ALL");

  const [supplierId, setSupplierId] =
    useState("ALL");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [actionLoading, setActionLoading] =
    useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/purchase-orders",
        {
          cache: "no-store",
          credentials: "include",
        }
      );

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to load purchase orders."
        );
      }

      setPurchaseOrders(
        Array.isArray(
          data.purchaseOrders
        )
          ? data.purchaseOrders
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
          : "Failed to load purchase orders."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function performAction(
    id: string,
    action: string
  ) {
    let reason = "";

    if (action === "CANCEL") {
      reason =
        window.prompt(
          "Enter cancellation reason:"
        )?.trim() || "";

      if (!reason) {
        return;
      }

      const confirmed =
        window.confirm(
          "Confirm cancellation of this Purchase Order?"
        );

      if (!confirmed) {
        return;
      }
    } else {
      const confirmed =
        window.confirm(
          `Confirm action: ${action}?`
        );

      if (!confirmed) {
        return;
      }
    }

    try {
      setActionLoading(
        `${id}:${action}`
      );
      setError("");

      const response = await fetch(
        `/api/admin/purchase-orders/${id}/action`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            action,
            reason,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Purchase order action failed."
        );
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Purchase order action failed."
      );
    } finally {
      setActionLoading("");
    }
  }

  const filtered =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return purchaseOrders.filter(
        (po) => {
          const haystack = [
            po.poNumber,
            po.status,
            po.supplier?.name || "",
            po.supplier?.phone || "",
            po.supplier?.email || "",
            po.supplier?.gstin || "",
            po.notes || "",
          ]
            .join(" ")
            .toLowerCase();

          return (
            (!query ||
              haystack.includes(query)) &&
            (status === "ALL" ||
              po.status === status) &&
            (supplierId === "ALL" ||
              po.supplierId ===
                supplierId)
          );
        }
      );
    }, [
      purchaseOrders,
      search,
      status,
      supplierId,
    ]);

  const summary =
    useMemo(() => {
      return {
        total:
          purchaseOrders.length,

        draft:
          purchaseOrders.filter(
            (po) =>
              po.status === "DRAFT"
          ).length,

        active:
          purchaseOrders.filter(
            (po) =>
              [
                "APPROVED",
                "ISSUED",
                "ACKNOWLEDGED",
                "PARTIALLY_RECEIVED",
              ].includes(po.status)
          ).length,

        received:
          purchaseOrders.filter(
            (po) =>
              [
                "RECEIVED",
                "CLOSED",
              ].includes(po.status)
          ).length,

        cancelled:
          purchaseOrders.filter(
            (po) =>
              po.status ===
              "CANCELLED"
          ).length,
      };
    }, [purchaseOrders]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 print:bg-white">

      <div className="mx-auto max-w-7xl space-y-6">

        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
              Procurement Control
            </p>

            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
              Purchase Orders
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Controlled procurement lifecycle before inventory purchase.
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <Link
              href="/admin/purchases"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700"
            >
              Purchases
            </Link>

            <Link
              href="/admin/accounting/procurement-analysis"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700"
            >
              Procurement Analysis
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

        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5">

          <p className="font-bold text-blue-900">
            Purchase Order Control
          </p>

          <p className="mt-2 text-sm leading-6 text-blue-800">
            A Purchase Order is a procurement commitment record.
            It does not itself increase stock, create a supplier
            payment, or create a completed purchase. Those accounting
            and inventory effects remain tied to their respective
            transaction workflows.
          </p>

        </section>

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
            {error}
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Total POs
            </p>
            <p className="mt-2 text-3xl font-extrabold">
              {summary.total}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Draft
            </p>
            <p className="mt-2 text-3xl font-extrabold">
              {summary.draft}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Active
            </p>
            <p className="mt-2 text-3xl font-extrabold text-blue-700">
              {summary.active}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Received / Closed
            </p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-700">
              {summary.received}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Cancelled
            </p>
            <p className="mt-2 text-3xl font-extrabold text-red-700">
              {summary.cancelled}
            </p>
          </div>

        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">

          <div className="grid gap-4 md:grid-cols-3">

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search PO / supplier / GSTIN..."
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >

              <option value="ALL">
                All Statuses
              </option>

              <option value="DRAFT">
                Draft
              </option>

              <option value="APPROVED">
                Approved
              </option>

              <option value="ISSUED">
                Issued
              </option>

              <option value="ACKNOWLEDGED">
                Acknowledged
              </option>

              <option value="PARTIALLY_RECEIVED">
                Partially Received
              </option>

              <option value="RECEIVED">
                Received
              </option>

              <option value="CLOSED">
                Closed
              </option>

              <option value="CANCELLED">
                Cancelled
              </option>

            </select>

            <select
              value={supplierId}
              onChange={(e) =>
                setSupplierId(e.target.value)
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

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">

            <h2 className="text-xl font-extrabold">
              Purchase Order Register
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filtered.length} purchase order(s) displayed.
            </p>

          </div>

          {loading ? (

            <div className="p-10 text-center text-slate-500">
              Loading purchase orders...
            </div>

          ) : filtered.length === 0 ? (

            <div className="p-10 text-center text-slate-500">
              No purchase orders found.
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="min-w-full text-left text-sm">

                <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                  <tr>

                    <th className="px-5 py-4">
                      PO
                    </th>

                    <th className="px-5 py-4">
                      Supplier
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Value
                    </th>

                    <th className="px-5 py-4">
                      Created
                    </th>

                    <th className="px-5 py-4">
                      Lifecycle
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {filtered.map(
                    (po) => (

                      <tr
                        key={po.id}
                        className="hover:bg-slate-50"
                      >

                        <td className="px-5 py-5">

                          <p className="font-extrabold text-slate-900">
                            {po.poNumber}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            ID: {po.id}
                          </p>

                        </td>

                        <td className="px-5 py-5">

                          <p className="font-bold">
                            {po.supplier?.name ||
                              "Unknown Supplier"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {po.supplier?.phone ||
                              po.supplier?.email ||
                              "â€”"}
                          </p>

                        </td>

                        <td className="px-5 py-5">

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-extrabold ${statusClass(
                              po.status
                            )}`}
                          >
                            {po.status}
                          </span>

                        </td>

                        <td className="px-5 py-5 font-extrabold">

                          {money(
                            po.totalPaise
                          )}

                          <p className="mt-1 text-xs font-normal text-slate-500">
                            GST:{" "}
                            {money(
                              po.gstPaise
                            )}
                          </p>

                        </td>

                        <td className="px-5 py-5 text-xs text-slate-600">
                          {dateTime(
                            po.requestedAt
                          )}
                        </td>

                        <td className="px-5 py-5">

                          <div className="flex max-w-md flex-wrap gap-2">

                            {po.status ===
                              "DRAFT" && (
                              <button
                                type="button"
                                disabled={
                                  actionLoading ===
                                  `${po.id}:APPROVE`
                                }
                                onClick={() =>
                                  performAction(
                                    po.id,
                                    "APPROVE"
                                  )
                                }
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                              >
                                Approve
                              </button>
                            )}

                            {po.status ===
                              "APPROVED" && (
                              <button
                                type="button"
                                disabled={
                                  actionLoading ===
                                  `${po.id}:ISSUE`
                                }
                                onClick={() =>
                                  performAction(
                                    po.id,
                                    "ISSUE"
                                  )
                                }
                                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                              >
                                Issue
                              </button>
                            )}

                            {po.status ===
                              "ISSUED" && (
                              <button
                                type="button"
                                disabled={
                                  actionLoading ===
                                  `${po.id}:ACKNOWLEDGE`
                                }
                                onClick={() =>
                                  performAction(
                                    po.id,
                                    "ACKNOWLEDGE"
                                  )
                                }
                                className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                              >
                                Acknowledge
                              </button>
                            )}

                            {po.status ===
                              "ACKNOWLEDGED" && (
                              <>
                                <button
                                  type="button"
                                  disabled={
                                    actionLoading ===
                                    `${po.id}:PARTIAL_RECEIVE`
                                  }
                                  onClick={() =>
                                    performAction(
                                      po.id,
                                      "PARTIAL_RECEIVE"
                                    )
                                  }
                                  className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  Partial Receive
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    actionLoading ===
                                    `${po.id}:RECEIVE`
                                  }
                                  onClick={() =>
                                    performAction(
                                      po.id,
                                      "RECEIVE"
                                    )
                                  }
                                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  Receive
                                </button>
                              </>
                            )}

                            {po.status ===
                              "PARTIALLY_RECEIVED" && (
                              <>
                                <button
                                  type="button"
                                  disabled={
                                    actionLoading ===
                                    `${po.id}:PARTIAL_RECEIVE`
                                  }
                                  onClick={() =>
                                    performAction(
                                      po.id,
                                      "PARTIAL_RECEIVE"
                                    )
                                  }
                                  className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  Update Partial
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    actionLoading ===
                                    `${po.id}:RECEIVE`
                                  }
                                  onClick={() =>
                                    performAction(
                                      po.id,
                                      "RECEIVE"
                                    )
                                  }
                                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  Mark Received
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    actionLoading ===
                                    `${po.id}:CLOSE`
                                  }
                                  onClick={() =>
                                    performAction(
                                      po.id,
                                      "CLOSE"
                                    )
                                  }
                                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  Close
                                </button>
                              </>
                            )}

                            {po.status ===
                              "RECEIVED" && (
                              <button
                                type="button"
                                disabled={
                                  actionLoading ===
                                  `${po.id}:CLOSE`
                                }
                                onClick={() =>
                                  performAction(
                                    po.id,
                                    "CLOSE"
                                  )
                                }
                                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                              >
                                Close
                              </button>
                            )}

                            {![
                              "CLOSED",
                              "CANCELLED",
                            ].includes(
                              po.status
                            ) && (
                              <button
                                type="button"
                                disabled={
                                  actionLoading ===
                                  `${po.id}:CANCEL`
                                }
                                onClick={() =>
                                  performAction(
                                    po.id,
                                    "CANCEL"
                                  )
                                }
                                className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            )}

                          </div>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">

          <h2 className="text-lg font-extrabold">
            PO Lifecycle Audit Controls
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold">
                No Silent Status Changes
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Status transitions are controlled by explicit
                lifecycle actions.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold">
                Cancellation Reason
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Cancellation requires a recorded reason and creates
                an audit event.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="font-bold">
                Transaction Separation
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                PO creation and approval do not independently change
                stock, supplier ledger or payment records.
              </p>
            </div>

          </div>

        </section>

      </div>

    </main>
  );
}
