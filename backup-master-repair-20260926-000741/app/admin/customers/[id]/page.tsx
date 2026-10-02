"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Order = {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  companyName: string | null;
  gstin: string | null;
  _count: {
    orders: number;
  };
  orders: Order[];
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = String(params.id);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");

  async function loadCustomer() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/customers/${customerId}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load customer."
        );
      }

      const data = result.data;

      setCustomer(data);
      setName(data.name || "");
      setPhone(data.phone || "");
      setEmail(data.email || "");
      setCompanyName(data.companyName || "");
      setGstin(data.gstin || "");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load customer."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (customerId) {
      loadCustomer();
    }
  }, [customerId]);

  async function saveCustomer(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Customer name is required.");
      return;
    }

    if (!phone.trim()) {
      setError("Customer phone is required.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/admin/customers/${customerId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || null,
            companyName: companyName.trim() || null,
            gstin: gstin.trim() || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to update customer."
        );
      }

      await loadCustomer();
      alert("Customer updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update customer."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-12 text-center shadow-sm">
          <p className="font-bold text-slate-500">
            Loading customer...
          </p>
        </div>
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Customer Not Found
          </h1>

          <p className="mt-2 text-red-600">
            {error}
          </p>

          <Link
            href="/admin/customers"
            className="mt-6 inline-block rounded-xl bg-blue-700 px-5 py-3 font-extrabold text-white"
          >
            ← Back to Customers
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">

        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-extrabold tracking-widest text-blue-700">
              OFFICEKART
            </p>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              Customer Details
            </h1>

            <p className="mt-2 text-slate-600">
              Manage customer information and orders.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

            <Link
              href={`/admin/customers/${customerId}/orders`}
              className="rounded-xl bg-green-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-green-700"
            >
              + New Order
            </Link>

            <Link
              href="/admin/customers"
              className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-700 shadow-sm"
            >
              ← Customers
            </Link>

            <Link
              href="/admin"
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white"
            >
              Dashboard
            </Link>

          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">

          <section className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Customer Information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update customer details.
                </p>
              </div>
            </div>

            <form onSubmit={saveCustomer}>
              <div className="grid gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Name *
                  </label>

                  <input
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Phone *
                  </label>

                  <input
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Company Name
                  </label>

                  <input
                    value={companyName}
                    onChange={(e) =>
                      setCompanyName(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    GSTIN
                  </label>

                  <input
                    value={gstin}
                    onChange={(e) =>
                      setGstin(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none focus:border-blue-500"
                  />
                </div>

              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-700 px-6 py-3 font-extrabold text-white hover:bg-blue-800 disabled:bg-slate-300"
                >
                  {saving
                    ? "Saving..."
                    : "Save Customer"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-900">
              Customer Summary
            </h2>

            <div className="mt-5 space-y-4">

              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-xs font-bold text-blue-600">
                  Customer
                </p>

                <p className="mt-1 text-lg font-extrabold text-slate-900">
                  {customer.name}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">
                  Phone
                </p>

                <p className="mt-1 font-extrabold text-slate-900">
                  {customer.phone}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">
                  Total Orders
                </p>

                <p className="mt-1 text-2xl font-extrabold text-slate-900">
                  {customer._count.orders}
                </p>
              </div>

              <Link
                href={`/admin/customers/${customerId}/orders`}
                className="block w-full rounded-xl bg-green-600 px-5 py-4 text-center font-extrabold text-white hover:bg-green-700"
              >
                + Create New Order
              </Link>

            </div>
          </section>

        </div>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Recent Orders
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest orders from this customer.
              </p>
            </div>

            <Link
              href={`/admin/customers/${customerId}/orders`}
              className="rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-extrabold text-white"
            >
              + New Order
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto">
            {customer.orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center">
                <p className="font-extrabold text-slate-600">
                  No orders found.
                </p>

                <Link
                  href={`/admin/customers/${customerId}/orders`}
                  className="mt-4 inline-block rounded-xl bg-green-600 px-5 py-3 font-extrabold text-white"
                >
                  Create First Order
                </Link>
              </div>
            ) : (
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="px-3 py-3">
                      Order
                    </th>

                    <th className="px-3 py-3">
                      Date
                    </th>

                    <th className="px-3 py-3">
                      Payment
                    </th>

                    <th className="px-3 py-3">
                      Status
                    </th>

                    <th className="px-3 py-3">
                      Total
                    </th>

                    <th className="px-3 py-3">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {customer.orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-slate-100"
                    >
                      <td className="px-3 py-4 font-extrabold text-slate-900">
                        {order.orderNumber}
                      </td>

                      <td className="px-3 py-4 text-sm text-slate-600">
                        {new Date(
                          order.createdAt
                        ).toLocaleDateString("en-IN")}
                      </td>

                      <td className="px-3 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                          {order.paymentStatus}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                          {order.orderStatus}
                        </span>
                      </td>

                      <td className="px-3 py-4 font-extrabold">
                        {money(order.totalAmount)}
                      </td>

                      <td className="px-3 py-4">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-extrabold text-white"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
