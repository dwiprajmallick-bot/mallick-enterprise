"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type POItem = {
  id: string;
  productId?: string | null;
  productName?: string | null;
  quantity?: number | null;
  orderedQuantity?: number | null;
  receivedQuantity?: number | null;
  receivedQty?: number | null;
  unitPrice?: number | null;
};

type PurchaseOrder = {
  id: string;
  poNumber?: string | null;
  supplierId?: string | null;
  orderDate?: string | null;
  status?: string | null;
  notes?: string | null;
  items: POItem[];
};

export default function CreateGRNPage() {
  const params = useParams();
  const router = useRouter();

  const id = String(params.id);

  const [purchaseOrder, setPurchaseOrder] =
    useState<PurchaseOrder | null>(null);

  const [receivedDate, setReceivedDate] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const today =
      new Date();

    const localDate =
      new Date(
        today.getTime() -
          today.getTimezoneOffset() *
            60000
      )
        .toISOString()
        .slice(0, 10);

    setReceivedDate(
      localDate
    );
  }, []);

  async function loadPurchaseOrder() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          `/api/admin/purchase-orders/${id}`,
          {
            method: "GET",
            cache: "no-store",
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
            "Failed to load Purchase Order."
        );
      }

      setPurchaseOrder(
        data.purchaseOrder ||
          data.order ||
          data.po
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Purchase Order."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      loadPurchaseOrder();
    }
  }, [id]);

  async function createGRN() {
    if (!purchaseOrder) {
      return;
    }

    try {
      setCreating(true);
      setError("");

      const response =
        await fetch(
          `/api/admin/purchase-orders/${id}/create-grn`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              receivedDate:
                receivedDate
                  ? new Date(
                      `${receivedDate}T00:00:00`
                    ).toISOString()
                  : new Date().toISOString(),
              notes:
                notes.trim() ||
                null,
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
            "Failed to create GRN."
        );
      }

      router.push(
        `/admin/goods-receipts/${data.grn.id}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create GRN."
      );
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="font-semibold text-slate-500">
              Loading Purchase Order...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!purchaseOrder) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="font-extrabold text-red-600">
              {error ||
                "Purchase Order not found."}
            </p>

            <Link
              href="/admin/purchase-orders"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
            >
              Back to Purchase Orders
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const items =
    purchaseOrder.items || [];

  const totalOrdered =
    items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.quantity ??
            item.orderedQuantity ??
            0
        ),
      0
    );

  const totalReceived =
    items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.receivedQuantity ??
            item.receivedQty ??
            0
        ),
      0
    );

  const totalRemaining =
    Math.max(
      totalOrdered -
        totalReceived,
      0
    );

  const canCreate =
    totalRemaining > 0;

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link
            href={`/admin/purchase-orders/${id}`}
            className="text-sm font-bold text-blue-600 hover:text-blue-800"
          >
            ← Back to Purchase Order
          </Link>

          <p className="mt-4 text-sm font-bold uppercase tracking-wider text-blue-600">
            দ্বীবরাজ মল্লিক · OfficeKart
          </p>

          <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
            Create Goods Receipt Note
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Create a GRN Draft from this Purchase Order.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Purchase Order
            </p>
            <p className="mt-2 text-xl font-extrabold text-slate-900">
              {purchaseOrder.poNumber ||
                purchaseOrder.id}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              PO Items
            </p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {items.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Already Received
            </p>
            <p className="mt-2 text-3xl font-extrabold text-blue-600">
              {totalReceived}
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
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-extrabold text-slate-900">
              Purchase Order Items
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              The GRN will contain all PO items with
              their current receiving position.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-4 text-xs font-extrabold uppercase text-slate-500">
                    #
                  </th>

                  <th className="px-5 py-4 text-xs font-extrabold uppercase text-slate-500">
                    Product
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
                </tr>
              </thead>

              <tbody>
                {items.map(
                  (item, index) => {
                    const ordered =
                      Number(
                        item.quantity ??
                          item.orderedQuantity ??
                          0
                      );

                    const received =
                      Number(
                        item.receivedQuantity ??
                          item.receivedQty ??
                          0
                      );

                    const remaining =
                      Math.max(
                        ordered -
                          received,
                        0
                      );

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-5 text-sm font-bold text-slate-500">
                          {index + 1}
                        </td>

                        <td className="px-5 py-5">
                          <p className="font-bold text-slate-800">
                            {item.productName ||
                              item.productId ||
                              "PO Item"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {item.productId ||
                              item.id}
                          </p>
                        </td>

                        <td className="px-5 py-5 text-right font-bold text-slate-700">
                          {ordered}
                        </td>

                        <td className="px-5 py-5 text-right font-bold text-blue-600">
                          {received}
                        </td>

                        <td className="px-5 py-5 text-right font-extrabold text-orange-600">
                          {remaining}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-900">
            GRN Draft Information
          </h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-bold text-slate-700">
                Received Date
              </label>

              <input
                type="date"
                value={receivedDate}
                onChange={(event) =>
                  setReceivedDate(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Notes
              </label>

              <input
                type="text"
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                placeholder="Optional receiving note..."
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-sm font-extrabold text-blue-900">
              Next step
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800">
              Creating this document will create a
              DRAFT GRN. You will then enter Receive
              Now quantities on the GRN Details page
              before posting it.
            </p>
          </div>

          {!canCreate && (
            <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-700">
              This Purchase Order has no remaining
              quantity to receive.
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/admin/purchase-orders/${id}`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-6 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={createGRN}
              disabled={
                creating ||
                !canCreate
              }
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating
                ? "Creating GRN..."
                : "Create GRN Draft"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
