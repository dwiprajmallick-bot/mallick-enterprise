import Link from "next/link";
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Purchase = {
  id: string;
  purchaseNumber: string;
  status?: string;
  paymentStatus?: string;
  totalPaise?: number;
  gstPaise?: number;
  purchasedAt?: string;
};

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
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
  purchases?: Purchase[];
};

function money(value?: number | null) {
  return `₹${((value || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function SupplierDetailsPage() {
  const params = useParams();
  const supplierId = params.id;
  const id = String(params.id);

  const [supplier, setSupplier] =
    useState<Supplier | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadSupplier() {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/admin/suppliers/${id}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to load supplier."
        );
      }

      setSupplier(
        data.supplier ||
          data.data ||
          data
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load supplier."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadSupplier();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-10 text-center">
          Loading supplier...
        </div>
      </main>
    );
  }

  if (!supplier) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-10 text-center">
          <h1 className="text-2xl font-extrabold text-red-600">
            Supplier not found
          </h1>
          <Link
            href={`/admin/suppliers/${supplierId}/ledger`}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            Account Statement
          </Link>

          {message && (
            <p className="mt-3 text-sm text-slate-500">
              {message}
            </p>
          )}
        </div>
      </main>
    );
  }

  const purchases = supplier.purchases || [];

  const totalPurchaseValue = purchases.reduce(
    (sum, purchase) =>
      sum + Number(purchase.totalPaise || 0),
    0
  );

  const paidPurchases = purchases.filter(
    (purchase) =>
      String(
        purchase.paymentStatus || ""
      ).toUpperCase() === "PAID"
  );

  const cancelledPurchases = purchases.filter(
    (purchase) =>
      String(
        purchase.status || ""
      ).toUpperCase() === "CANCELLED"
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                দ্বীবরাজ মল্লিক • OfficeKart
              </p>

              <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
                {supplier.name}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Supplier Master • Procurement History
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  window.location.href =
                    "/admin/suppliers"
                }
                className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                ← Suppliers
              </button>

              <button
                type="button"
                onClick={() =>
                  window.location.href =
                    `/admin/suppliers/${supplier.id}/edit`
                }
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-blue-700"
              >
                Edit Supplier
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Purchases
            </p>

            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {purchases.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Purchase Value
            </p>

            <p className="mt-2 text-3xl font-extrabold text-blue-700">
              {money(totalPurchaseValue)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Paid Purchases
            </p>

            <p className="mt-2 text-3xl font-extrabold text-green-700">
              {paidPurchases.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Cancelled
            </p>

            <p className="mt-2 text-3xl font-extrabold text-red-600">
              {cancelledPurchases.length}
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Supplier Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Registered supplier master data
              </p>
            </div>

            <span
              className={`rounded-xl px-4 py-2 text-xs font-extrabold ${
                String(
                  supplier.status || "ACTIVE"
                ).toUpperCase() === "ACTIVE"
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {String(
                supplier.status || "ACTIVE"
              ).toUpperCase()}
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

            <div>
              <p className="text-xs font-bold uppercase text-slate-400">
                Phone
              </p>
              <p className="mt-1 font-bold text-slate-800">
                {supplier.phone || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-slate-400">
                Email
              </p>
              <p className="mt-1 font-bold text-slate-800">
                {supplier.email || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-slate-400">
                GSTIN
              </p>
              <p className="mt-1 font-bold text-slate-800">
                {supplier.gstin || "Unregistered"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-slate-400">
                PAN
              </p>
              <p className="mt-1 font-bold text-slate-800">
                {supplier.pan || "—"}
              </p>
            </div>

            <div className="lg:col-span-2">
              <p className="text-xs font-bold uppercase text-slate-400">
                Address
              </p>

              <p className="mt-1 font-bold text-slate-800">
                {[
                  supplier.address,
                  supplier.city,
                  supplier.state,
                  supplier.pincode,
                ]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Purchase History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                All procurement records linked to this supplier.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                (window.location.href =
                  "/admin/purchases")
              }
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-blue-700"
            >
              New Purchase
            </button>
          </div>

          {purchases.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No purchase history available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-500">
                      Purchase
                    </th>

                    <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-500">
                      Date
                    </th>

                    <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-500">
                      Total
                    </th>

                    <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-500">
                      Payment
                    </th>

                    <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-xs font-extrabold uppercase text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {purchases.map((purchase) => (
                    <tr
                      key={purchase.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-5 font-extrabold text-slate-900">
                        {purchase.purchaseNumber}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {purchase.purchasedAt
                          ? new Date(
                              purchase.purchasedAt
                            ).toLocaleDateString("en-IN")
                          : "—"}
                      </td>

                      <td className="px-6 py-5 font-extrabold text-slate-900">
                        {money(purchase.totalPaise)}
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                          {purchase.paymentStatus ||
                            "UNPAID"}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-xl px-3 py-2 text-xs font-extrabold ${
                            String(
                              purchase.status
                            ).toUpperCase() === "CANCELLED"
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {purchase.status ||
                            "RECEIVED"}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <button
                          type="button"
                          onClick={() =>
                            (window.location.href =
                              `/admin/purchases/${purchase.id}`)
                          }
                          className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-100"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-lg font-extrabold text-blue-900">
            Supplier Accounting Path
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-bold text-slate-400">
                01
              </p>
              <p className="mt-1 font-extrabold text-slate-800">
                Purchase
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-bold text-slate-400">
                02
              </p>
              <p className="mt-1 font-extrabold text-slate-800">
                Stock Received
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-bold text-slate-400">
                03
              </p>
              <p className="mt-1 font-extrabold text-slate-800">
                Supplier Payment
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-bold text-slate-400">
                04
              </p>
              <p className="mt-1 font-extrabold text-slate-800">
                Ledger / Outstanding
              </p>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
