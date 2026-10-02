"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type GRNItem = {
  id: string;
  purchaseOrderItemId: string;
  orderedQty: number;
  alreadyReceived: number;
  remainingQty: number;
  receiveNow: number;
  purchaseOrderItem?: {
    id: string;
    productId?: string | null;
    productName?: string | null;
    quantity?: number | null;
    orderedQuantity?: number | null;
    unitPrice?: number | null;
    purchasePrice?: number | null;
  } | null;
};

type GRN = {
  id: string;
  grnNumber: string;
  receivedDate: string;
  status: "DRAFT" | "POSTED" | "CANCELLED";
  notes?: string | null;
  postedAt?: string | null;
  postedBy?: string | null;
  purchaseOrder?: {
    id: string;
    poNumber?: string | null;
  } | null;
  items: GRNItem[];
};

export default function GRNDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const [grn, setGrn] = useState<GRN | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  async function loadGRN() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/goods-receipts/${id}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to load GRN."
        );
      }

      setGrn(data.grn);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load GRN."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      loadGRN();
    }
  }, [id]);

  function updateReceiveNow(
    itemId: string,
    value: string
  ) {
    if (!grn) return;

    const numericValue =
      Number(value);

    setGrn({
      ...grn,
      items: grn.items.map(
        (item) => {
          if (item.id !== itemId) {
            return item;
          }

          const safeValue =
            Number.isFinite(
              numericValue
            )
              ? Math.max(
                  0,
                  Math.min(
                    Math.floor(
                      numericValue
                    ),
                    item.remainingQty
                  )
                )
              : 0;

          return {
            ...item,
            receiveNow:
              safeValue,
          };
        }
      ),
    });
  }

  async function saveReceiveNow() {
    if (!grn) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response =
        await fetch(
          `/api/admin/goods-receipts/${id}/items`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              items: grn.items.map(
                (item) => ({
                  id: item.id,
                  receiveNow:
                    Number(
                      item.receiveNow || 0
                    ),
                })
              ),
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Failed to save quantities."
        );
      }

      setGrn(data.grn);

      setMessage(
        "Receive Now quantities saved successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save quantities."
      );
    } finally {
      setSaving(false);
    }
  }

  async function postGRN() {
    if (!grn) return;

    const confirmed =
      window.confirm(
        "Are you sure you want to POST this GRN? Once posted, it cannot be edited."
      );

    if (!confirmed) return;

    try {
      setPosting(true);
      setError("");
      setMessage("");

      const response =
        await fetch(
          `/api/admin/goods-receipts/${id}/post`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              postedBy: "admin",
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Failed to post GRN."
        );
      }

      setGrn(data.result.grn);

      setMessage(
        "GRN posted successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to post GRN."
      );
    } finally {
      setPosting(false);
    }
  }

  async function cancelGRN() {
    if (!grn) return;

    const reason =
      cancelReason.trim();

    if (!reason) {
      setError(
        "Cancellation reason is required."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to cancel this GRN?"
      );

    if (!confirmed) return;

    try {
      setCancelling(true);
      setError("");
      setMessage("");

      const response =
        await fetch(
          `/api/admin/goods-receipts/${id}/cancel`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              reason,
              cancelledBy:
                "admin",
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Failed to cancel GRN."
        );
      }

      setGrn(data.grn);

      setCancelReason("");

      setMessage(
        "GRN cancelled successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to cancel GRN."
      );
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="font-semibold text-slate-500">
              Loading GRN...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!grn) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-extrabold text-red-600">
              {error ||
                "GRN not found."}
            </p>

            <Link
              href="/admin/goods-receipts"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
            >
              Back to GRNs
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const totalOrdered =
    grn.items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.orderedQty || 0
        ),
      0
    );

  const totalAlreadyReceived =
    grn.items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.alreadyReceived || 0
        ),
      0
    );

  const totalRemaining =
    grn.items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.remainingQty || 0
        ),
      0
    );

  const totalReceiveNow =
    grn.items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.receiveNow || 0
        ),
      0
    );

  const editable =
    grn.status === "DRAFT";

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/admin/goods-receipts"
              className="text-sm font-bold text-blue-600 hover:text-blue-800"
            >
              ← Back to GRNs
            </Link>

            <p className="mt-4 text-sm font-bold uppercase tracking-wider text-blue-600">
              দ্বীবরাজ মল্লিক · OfficeKart
            </p>

            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
              {grn.grnNumber}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Purchase Order:{" "}
              {grn.purchaseOrder?.poNumber ||
                "—"}
            </p>
          </div>

          <div>
            <span
              className={`inline-flex rounded-full px-4 py-2 text-sm font-extrabold ${
                grn.status === "POSTED"
                  ? "bg-green-100 text-green-700"
                  : grn.status ===
                    "CANCELLED"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {grn.status}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
            {message}
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Ordered
            </p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {totalOrdered}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Already Received
            </p>
            <p className="mt-2 text-3xl font-extrabold text-blue-600">
              {totalAlreadyReceived}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Remaining
            </p>
            <p className="mt-2 text-3xl font-extrabold text-orange-600">
              {totalRemaining}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Receive Now
            </p>
            <p className="mt-2 text-3xl font-extrabold text-green-600">
              {totalReceiveNow}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-extrabold text-slate-900">
              Receiving Items
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enter the quantity physically received
              against each Purchase Order item.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-4 text-xs font-extrabold uppercase text-slate-500">
                    #
                  </th>
                  <th className="px-5 py-4 text-xs font-extrabold uppercase text-slate-500">
                    Product / PO Item
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-extrabold uppercase text-slate-500">
                    Ordered
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-extrabold uppercase text-slate-500">
                    Already Received
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-extrabold uppercase text-slate-500">
                    Remaining
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-extrabold uppercase text-slate-500">
                    Receive Now
                  </th>
                </tr>
              </thead>

              <tbody>
                {grn.items.map(
                  (item, index) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-5 py-5 text-sm font-bold text-slate-500">
                        {index + 1}
                      </td>

                      <td className="px-5 py-5">
                        <p className="font-bold text-slate-800">
                          {item.purchaseOrderItem
                            ?.productName ||
                            item.purchaseOrderItem
                              ?.productId ||
                            "PO Item"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          PO Item ID:{" "}
                          {
                            item.purchaseOrderItemId
                          }
                        </p>
                      </td>

                      <td className="px-5 py-5 text-right text-sm font-bold text-slate-700">
                        {item.orderedQty}
                      </td>

                      <td className="px-5 py-5 text-right text-sm font-bold text-blue-600">
                        {item.alreadyReceived}
                      </td>

                      <td className="px-5 py-5 text-right text-sm font-extrabold text-orange-600">
                        {item.remainingQty}
                      </td>

                      <td className="px-5 py-5 text-right">
                        {editable ? (
                          <input
                            type="number"
                            min={0}
                            max={
                              item.remainingQty
                            }
                            step={1}
                            value={
                              item.receiveNow
                            }
                            onChange={(
                              event
                            ) =>
                              updateReceiveNow(
                                item.id,
                                event.target
                                  .value
                              )
                            }
                            className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-right text-sm font-extrabold outline-none focus:border-blue-500"
                          />
                        ) : (
                          <span className="font-extrabold text-green-600">
                            {
                              item.receiveNow
                            }
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900">
              GRN Information
            </h2>

            <div className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="font-semibold text-slate-500">
                  GRN Number
                </span>
                <span className="font-bold text-slate-800">
                  {grn.grnNumber}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="font-semibold text-slate-500">
                  Received Date
                </span>
                <span className="font-bold text-slate-800">
                  {new Date(
                    grn.receivedDate
                  ).toLocaleDateString(
                    "en-IN"
                  )}
                </span>
              </div>

              {grn.postedAt && (
                <div className="flex justify-between gap-4">
                  <span className="font-semibold text-slate-500">
                    Posted At
                  </span>
                  <span className="font-bold text-slate-800">
                    {new Date(
                      grn.postedAt
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </span>
                </div>
              )}

              {grn.postedBy && (
                <div className="flex justify-between gap-4">
                  <span className="font-semibold text-slate-500">
                    Posted By
                  </span>
                  <span className="font-bold text-slate-800">
                    {grn.postedBy}
                  </span>
                </div>
              )}

              {grn.notes && (
                <div>
                  <p className="font-semibold text-slate-500">
                    Notes
                  </p>
                  <p className="mt-2 rounded-2xl bg-slate-50 p-4 text-slate-700">
                    {grn.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900">
              GRN Actions
            </h2>

            {editable ? (
              <>
                <button
                  type="button"
                  onClick={
                    saveReceiveNow
                  }
                  disabled={saving}
                  className="mt-5 w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Receive Now"}
                </button>

                <button
                  type="button"
                  onClick={postGRN}
                  disabled={
                    posting ||
                    saving
                  }
                  className="mt-3 w-full rounded-2xl bg-green-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {posting
                    ? "Posting..."
                    : "POST GRN"}
                </button>

                <div className="mt-6 border-t border-slate-200 pt-5">
                  <label className="text-sm font-bold text-slate-700">
                    Cancellation Reason
                  </label>

                  <textarea
                    value={
                      cancelReason
                    }
                    onChange={(event) =>
                      setCancelReason(
                        event.target
                          .value
                      )
                    }
                    rows={3}
                    placeholder="Enter reason before cancelling..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500"
                  />

                  <button
                    type="button"
                    onClick={
                      cancelGRN
                    }
                    disabled={
                      cancelling
                    }
                    className="mt-3 w-full rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-extrabold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cancelling
                      ? "Cancelling..."
                      : "Cancel GRN"}
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                <p className="font-extrabold text-slate-800">
                  This GRN is locked.
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {grn.status ===
                  "POSTED"
                    ? "Posted GRNs cannot be edited or cancelled. Any correction must use a controlled reversal process."
                    : "Cancelled GRNs cannot be edited."}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
