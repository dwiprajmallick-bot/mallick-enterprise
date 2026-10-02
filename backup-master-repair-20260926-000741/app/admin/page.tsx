"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DashboardData = {
  products: {
    total: number;
    active: number;
  };
  customers: {
    total: number;
  };
  orders: {
    total: number;
    pending: number;
  };
  quotes: {
    total: number;
    new: number;
  };
  finance: {
    totalSales: number;
    totalProfit: number;
  };
};

function money(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/admin/dashboard", {
        credentials: "include",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load dashboard."
        );
      }

      setData(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <p className="text-sm font-extrabold tracking-widest text-blue-700">
            OFFICEKART
          </p>

          <p className="mt-3 text-lg font-bold text-slate-600">
            Loading OfficeKart Admin...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">

        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-extrabold tracking-widest text-blue-700">
              OFFICEKART
            </p>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900 md:text-4xl">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-slate-600">
              Manage products, customers, orders, stock and business information.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "↻ Refresh"}
            </button>

            <Link
              href="/admin/products"
              className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-extrabold text-white shadow hover:bg-blue-800"
            >
              Manage Products →
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 md:flex-row md:items-center md:justify-between">
            <p className="font-semibold">
              {error}
            </p>

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {data && (
          <>

            <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

              <Link
                href="/admin/products"
                className="group rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-500">
                    Total Products
                  </p>

                  <span className="rounded-xl bg-blue-50 px-3 py-2 text-xl">
                    📦
                  </span>
                </div>

                <p className="mt-4 text-3xl font-extrabold text-slate-900">
                  {data.products.total}
                </p>

                <p className="mt-2 text-sm font-semibold text-green-600">
                  {data.products.active} active
                </p>

                <p className="mt-4 text-xs font-bold text-blue-600 group-hover:underline">
                  Manage Products →
                </p>
              </Link>

              <Link
                href="/admin/customers"
                className="group rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-500">
                    Customers
                  </p>

                  <span className="rounded-xl bg-purple-50 px-3 py-2 text-xl">
                    👥
                  </span>
                </div>

                <p className="mt-4 text-3xl font-extrabold text-slate-900">
                  {data.customers.total}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Registered customers
                </p>

                <p className="mt-4 text-xs font-bold text-purple-600 group-hover:underline">
                  Manage Customers →
                </p>
              </Link>

              <Link
                href="/admin/orders"
                className="group rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-500">
                    Orders
                  </p>

                  <span className="rounded-xl bg-orange-50 px-3 py-2 text-xl">
                    🧾
                  </span>
                </div>

                <p className="mt-4 text-3xl font-extrabold text-slate-900">
                  {data.orders.total}
                </p>

                <p className="mt-2 text-sm font-semibold text-orange-600">
                  {data.orders.pending} pending
                </p>

                <p className="mt-4 text-xs font-bold text-orange-600 group-hover:underline">
                  Manage Orders →
                </p>
              </Link>

              <Link
                href="/admin/quotes"
                className="group rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-500">
                    New Quotes
                  </p>

                  <span className="rounded-xl bg-green-50 px-3 py-2 text-xl">
                    💬
                  </span>
                </div>

                <p className="mt-4 text-3xl font-extrabold text-slate-900">
                  {data.quotes.new}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Total quotes: {data.quotes.total}
                </p>

                <p className="mt-4 text-xs font-bold text-green-600 group-hover:underline">
                  Manage Quotes →
                </p>
              </Link>

            </section>

            <section className="mt-6 grid gap-5 md:grid-cols-2">

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500">
                      Total Sales
                    </p>

                    <p className="mt-3 text-3xl font-extrabold text-slate-900">
                      {money(data.finance.totalSales)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-blue-50 px-4 py-3 text-2xl">
                    ₹
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-500">
                  Based on recorded paid/confirmed business orders.
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-500">
                      Total Profit
                    </p>

                    <p className="mt-3 text-3xl font-extrabold text-green-700">
                      {money(data.finance.totalProfit)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-green-50 px-4 py-3 text-2xl">
                    📈
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-500">
                  Calculated from product purchase and selling prices.
                </p>
              </div>

            </section>

            <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Quick Management
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Quickly access the main OfficeKart management sections.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <Link
                  href="/admin/products"
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-blue-500 hover:bg-blue-50"
                >
                  <p className="text-lg font-extrabold text-slate-900">
                    📦 Products
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Add, edit, activate, deactivate and delete products.
                  </p>
                </Link>

                <Link
                  href="/admin/customers"
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-purple-500 hover:bg-purple-50"
                >
                  <p className="text-lg font-extrabold text-slate-900">
                    👥 Customers
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Manage customer records and order history.
                  </p>
                </Link>

                <Link
                  href="/admin/orders"
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-orange-500 hover:bg-orange-50"
                >
                  <p className="text-lg font-extrabold text-slate-900">
                    🧾 Orders
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Manage orders, payments, delivery and invoices.
                  </p>
                </Link>

                <Link
                  href="/admin/stock"
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-green-500 hover:bg-green-50"
                >
                  <p className="text-lg font-extrabold text-slate-900">
                    📊 Stock
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Manage stock movements and inventory history.
                  </p>
                </Link>

              </div>
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-3">

              <Link
                href="/admin/orders/new"
                className="rounded-2xl bg-blue-700 p-5 text-white shadow-sm transition hover:bg-blue-800"
              >
                <p className="text-lg font-extrabold">
                  + Create New Order
                </p>

                <p className="mt-1 text-sm text-blue-100">
                  Create a customer order manually.
                </p>
              </Link>

              <Link
                href="/admin/products/new"
                className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm transition hover:bg-slate-800"
              >
                <p className="text-lg font-extrabold">
                  + Add New Product
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  Add a new OfficeKart product.
                </p>
              </Link>

              <Link
                href="/admin/stock"
                className="rounded-2xl bg-green-700 p-5 text-white shadow-sm transition hover:bg-green-800"
              >
                <p className="text-lg font-extrabold">
                  📊 Manage Stock
                </p>

                <p className="mt-1 text-sm text-green-100">
                  Add stock, remove stock and view history.
                </p>
              </Link>

            </section>

          </>
        )}

      </div>
    </main>
  );
}
