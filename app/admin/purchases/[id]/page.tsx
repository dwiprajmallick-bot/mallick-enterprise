"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Supplier = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
};

type Product = {
  id: string;
  name: string;
  sku?: string | null;
};

type PurchaseItem = {
  id: string;
  productId: string;
  quantity: number;
  unitCostPaise: number;
  gstRate: number;
  product?: Product;
};

type Purchase = {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  status: string;
  subtotalPaise: number;
  gstPaise: number;
  deliveryPaise: number;
  totalPaise: number;
  paymentStatus: string;
  notes?: string | null;
  purchasedAt?: string;
  createdAt?: string;
  supplier?: Supplier;
  items?: PurchaseItem[];
};

function money(value?: number | null) {
  return `₹${((value || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PurchaseDetailsPage() {
  const params = useParams();
  const id = String(params.id);

  const [purchase, setPurchase] =
    useState<Purchase | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadPurchase() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `/api/admin/purchases/${id}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to load purchase."
        );
      }

      const row =
        data.purchase ||
        data.data ||
        data;

      setPurchase(row);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load purchase."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadPurchase();
  }, [id]);

  async function cancelPurchase() {
    if (!purchase) return;

    const reason = window.prompt(
      `Cancellation reason for ${purchase.purchaseNumber}:`
    );

    if (!reason || !reason.trim()) return;

    try {
      const response = await fetch(
        `/api/admin/purchases/${purchase.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: reason.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.message || "Purchase cancellation failed."
        );
      }

      setMessage(
        "Purchase cancelled successfully. Stock and financial reversals were processed through the existing cancellation workflow."
      );

      await loadPurchase();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Purchase cancellation failed."
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-10 text-center">
          Loading purchase...
        </div>
      </main>
    );
  }

  if (!purchase) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-10 text-center">
          <h1 className="text-2xl font-extrabold text-red-600">
            Purchase not found
          </h1>

          {message && (
            <p className="mt-3 text-sm text-slate-500">
              {message}
            </p>
          )}
        </div>
      </main>
    );
  }

  const cancelled =
    purchase.status.toUpperCase() === "CANCELLED";

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                দ্বীবরাজ মল্লিক • OfficeKart
              </p>

              <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
                {purchase.purchaseNumber}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Purchase Details & Procurement Record
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  window.location.href =
                    "/admin/purchases"
                }
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                ← Purchases
              </button>

              {!cancelled && (
                <button
                  type="button"
                  onClick={cancelPurchase}
                  className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-red-700"
                >
                  Cancel Purchase
                </button>
              )}
            </div>
          </div>
        </header>

        {message && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-800">
            {message}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">
              Purchase Status
            </p>

            <p
              className={`mt-2 text-xl font-extrabold ${
                cancelled
                  ? "text-red-600"
                  : "text-green-700"
              }`}
            >
              {purchase.status}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">
              Payment Status
            </p>

            <p className="mt-2 text-xl font-extrabold text-blue-700">
              {purchase.paymentStatus}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">
              Total
            </p>

            <p className="mt-2 text-xl font-extrabold text-slate-900">
              {money(purchase.totalPaise)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">
              Date
            </p>

            <p className="mt-2 text-xl font-extrabold text-slate-900">
              {purchase.purchasedAt
                ? new Date(
                    purchase.purchasedAt
                  ).toLocaleDateString("en-IN")
                : "—"}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">

          <div className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Supplier
                </h2>

                <p className="text-sm text-slate-500">
                  Procurement partner
                </p>
              </div>

              {purchase.supplier?.id && (
                <button
                  type="button"
                  onClick={() =>
                    window.location.href = `/admin/suppliers/${purchase.supplier?.id}`
                  }
                  className="rounded-xl border border-blue-200 px-4 py-2 text-xs font-extrabold text-blue-600 hover:bg-blue-50"
                >
                  View Supplier
                </button>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">
                  Name
                </p>

                <p className="mt-1 font-extrabold text-slate-900">
                  {purchase.supplier?.name ||
                    purchase.supplierId}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-slate-400">
                  Phone
                </p>

                <p className="mt-1 font-semibold text-slate-700">
                  {purchase.supplier?.phone || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-slate-400">
                  GSTIN
                </p>

                <p className="mt-1 font-semibold text-slate-700">
                  {purchase.supplier?.gstin ||
                    "Unregistered"}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-slate-400">
                  PAN
                </p>

                <p className="mt-1 font-semibold text-slate-700">
                  {purchase.supplier?.pan || "—"}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs font-bold uppercase text-slate-400">
                  Address
                </p>

                <p className="mt-1 font-semibold text-slate-700">
                  {[
                    purchase.supplier?.address,
                    purchase.supplier?.city,
                    purchase.supplier?.state,
                    purchase.supplier?.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
            <h2 className="text-xl font-extrabold">
              Financial Summary
            </h2>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">
                  Subtotal
                </span>

                <span className="font-bold">
                  {money(purchase.subtotalPaise)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-300">
                  GST
                </span>

                <span className="font-bold">
                  {money(purchase.gstPaise)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-300">
                  Delivery
                </span>

                <span className="font-bold">
                  {money(purchase.deliveryPaise)}
                </span>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <div className="flex justify-between text-lg">
                  <span className="font-extrabold">
                    Total
                  </span>

                  <span className="font-extrabold">
                    {money(purchase.totalPaise)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-extrabold text-slate-900">
              Purchased Items
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Products received into OfficeKart stock.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-500">
                    Product
                  </th>

                  <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-500">
                    Quantity
                  </th>

                  <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-500">
                    Unit Cost
                  </th>

                  <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-500">
                    GST
                  </th>

                  <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-500">
                    Line Total
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {(purchase.items || []).map((item) => {
                  const taxable =
                    item.quantity *
                    item.unitCostPaise;

                  const gst =
                    taxable *
                    (Number(item.gstRate || 0) / 100);

                  const lineTotal = taxable + gst;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-5">
                        <p className="font-extrabold text-slate-900">
                          {item.product?.name ||
                            item.productId}
                        </p>

                        {item.product?.sku && (
                          <p className="mt-1 text-xs text-slate-500">
                            SKU: {item.product.sku}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-5 font-bold text-slate-700">
                        {item.quantity}
                      </td>

                      <td className="px-6 py-5 font-bold text-slate-700">
                        {money(item.unitCostPaise)}
                      </td>

                      <td className="px-6 py-5 font-bold text-slate-700">
                        {item.gstRate}%
                        <span className="ml-2 text-xs text-slate-400">
                          {money(gst)}
                        </span>
                      </td>

                      <td className="px-6 py-5 font-extrabold text-slate-900">
                        {money(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {purchase.notes && (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900">
              Notes
            </h2>

            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
              {purchase.notes}
            </p>
          </section>
        )}

        <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-lg font-extrabold text-blue-900">
            Procurement Traceability
          </h2>

          <p className="mt-2 text-sm leading-6 text-blue-800">
            This purchase is linked to the supplier, purchased
            products, stock receiving workflow, GST record,
            supplier payment and audit trail through the existing
            OfficeKart backend architecture.
          </p>
        </section>

      </div>
    </main>
  );
}
