"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Order = {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  paymentMethod: string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    companyName: string | null;
  };
  _count: {
    items: number;
  };
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/orders",
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load orders."
        );
      }

      setOrders(result.data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load orders."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">

        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-extrabold tracking-widest text-blue-700">
              OFFICEKART
            </p>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              Orders
            </h1>

            <p className="mt-2 text-slate-600">
              Manage customer orders and order status.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-extrabold text-white"
          >
            ← Dashboard
          </Link>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-3xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-extrabold text-slate-900">
              Recent Orders
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {orders.length} order
              {orders.length === 1 ? "" : "s"}
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <p className="font-bold text-slate-500">
                Loading orders...
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-lg font-extrabold text-slate-700">
                No orders found.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Orders created from customers will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">

                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">
                      Order
                    </th>

                    <th className="px-6 py-4">
                      Customer
                    </th>

                    <th className="px-6 py-4">
                      Items
                    </th>

                    <th className="px-6 py-4">
                      Total
                    </th>

                    <th className="px-6 py-4">
                      Order Status
                    </th>

                    <th className="px-6 py-4">
                      Payment
                    </th>

                    <th className="px-6 py-4">
                      Date
                    </th>

                    <th className="px-6 py-4 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-6 py-5">
                        <p className="font-extrabold text-slate-900">
                          {order.orderNumber}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {order.paymentMethod}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="font-bold text-slate-900">
                          {order.customer.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {order.customer.phone}
                        </p>

                        {order.customer.companyName && (
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {order.customer.companyName}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-5 font-bold text-slate-700">
                        {order._count.items}
                      </td>

                      <td className="px-6 py-5 font-extrabold text-slate-900">
                        ₹{order.totalAmount.toFixed(2)}
                      </td>

                      <td className="px-6 py-5">
                        <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-extrabold text-yellow-700">
                          {order.orderStatus}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-700">
                          {order.paymentStatus}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {new Date(
                          order.createdAt
                        ).toLocaleDateString("en-IN")}
                      </td>

                      <td className="px-6 py-5 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-block rounded-xl bg-blue-700 px-4 py-2 text-sm font-extrabold text-white hover:bg-blue-800"
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

      </div>
    </main>
  );
}
