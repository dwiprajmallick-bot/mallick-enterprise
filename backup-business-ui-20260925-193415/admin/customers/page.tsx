"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  companyName: string | null;
  gstin: string | null;
  createdAt: string;
  _count?: {
    orders: number;
  };
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/customers", {
        credentials: "include",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load customers.");
      }

      setCustomers(result.data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load customers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function createCustomer(e: React.FormEvent) {
    e.preventDefault();

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
      setError("");
      setSuccess("");

      const response = await fetch("/api/admin/customers", {
        method: "POST",
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
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to create customer."
        );
      }

      setName("");
      setPhone("");
      setEmail("");
      setCompanyName("");
      setGstin("");

      setShowForm(false);
      setSuccess("Customer created successfully.");

      await loadCustomers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create customer."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(customer: Customer) {
    const orderCount = customer._count?.orders || 0;

    if (orderCount > 0) {
      setError(
        "This customer has existing orders and cannot be deleted."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete customer "${customer.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/customers/${customer.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to delete customer."
        );
      }

      setSuccess("Customer deleted successfully.");
      await loadCustomers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete customer."
      );
    }
  }

  const filteredCustomers = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return customers;

    return customers.filter((customer) =>
      [
        customer.name,
        customer.phone,
        customer.email,
        customer.companyName,
        customer.gstin,
      ]
        .filter(Boolean)
        .some((item) =>
          String(item).toLowerCase().includes(value)
        )
    );
  }, [customers, search]);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">

        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-extrabold tracking-widest text-blue-700">
              OFFICEKART
            </p>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              Customer Management
            </h1>

            <p className="mt-2 text-slate-600">
              Manage OfficeKart business customers.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
            >
              ← Dashboard
            </Link>

            <button
              type="button"
              onClick={() => {
                setShowForm((value) => !value);
                setError("");
                setSuccess("");
              }}
              className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-blue-800"
            >
              {showForm ? "Close Form" : "+ Add Customer"}
            </button>

            <button
              type="button"
              onClick={loadCustomers}
              className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 font-semibold text-green-700">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700">
            {error}
          </div>
        )}

        {showForm && (
          <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-900">
              Add New Customer
            </h2>

            <form
              onSubmit={createCustomer}
              className="mt-6 grid gap-5 md:grid-cols-2"
            >
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Customer Name *
                </label>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Customer name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Phone *
                </label>

                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile number"
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Company Name
                </label>

                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company / Office name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  GSTIN
                </label>

                <input
                  value={gstin}
                  onChange={(e) =>
                    setGstin(e.target.value.toUpperCase())
                  }
                  placeholder="GSTIN"
                  maxLength={15}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 uppercase outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-blue-700 px-6 py-3 font-extrabold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving Customer..." : "Save Customer"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Total Customers
            </p>

            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {customers.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Customers With Orders
            </p>

            <p className="mt-2 text-3xl font-extrabold text-blue-700">
              {
                customers.filter(
                  (customer) => (customer._count?.orders || 0) > 0
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Showing
            </p>

            <p className="mt-2 text-3xl font-extrabold text-green-700">
              {filteredCustomers.length}
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-extrabold text-slate-900">
              Customer List
            </h2>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, company, email..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 md:w-96"
            />
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <p className="font-bold text-slate-500">
                Loading customers...
              </p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center">
              <p className="text-lg font-extrabold text-slate-700">
                No customers found
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Add your first customer using the button above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="px-4 py-4 font-bold">Customer</th>
                    <th className="px-4 py-4 font-bold">Phone</th>
                    <th className="px-4 py-4 font-bold">Company</th>
                    <th className="px-4 py-4 font-bold">Orders</th>
                    <th className="px-4 py-4 font-bold">Created</th>
                    <th className="px-4 py-4 font-bold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map((customer) => {
                    const orderCount =
                      customer._count?.orders || 0;

                    return (
                      <tr
                        key={customer.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-4 py-4">
                          <p className="font-extrabold text-slate-900">
                            {customer.name}
                          </p>

                          {customer.email && (
                            <p className="mt-1 text-xs text-slate-500">
                              {customer.email}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                          {customer.phone}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {customer.companyName || "—"}
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                            {orderCount}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-500">
                          {new Date(
                            customer.createdAt
                          ).toLocaleDateString("en-IN")}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/admin/customers/${customer.id}`}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-blue-700"
                            >
                              View / Edit
                            </Link>

                            <button
                              type="button"
                              disabled={orderCount > 0}
                              onClick={() =>
                                deleteCustomer(customer)
                              }
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
