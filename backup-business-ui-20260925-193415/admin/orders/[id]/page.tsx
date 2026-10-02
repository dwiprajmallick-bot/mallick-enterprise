"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  totalPrice: number;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  companyName: string | null;
  gstin: string | null;
};

type Order = {
  id: string;
  orderNumber: string;
  subtotal: number;
  deliveryCharge: number;
  gstAmount: number;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  paymentMethod: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  items: OrderItem[];
};

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const PAYMENT_STATUSES = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
];

export default function AdminOrderDetailsPage() {
  const params = useParams();

  const orderId = String(params.id);

  const [order, setOrder] = useState<Order | null>(null);

  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadOrder() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/orders/${orderId}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load order."
        );
      }

      setOrder(result.data);
      setOrderStatus(result.data.orderStatus);
      setPaymentStatus(result.data.paymentStatus);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load order."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  async function updateStatus() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/orders/${orderId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            orderStatus,
            paymentStatus,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to update order."
        );
      }

      setOrder(result.data);

      setOrderStatus(result.data.orderStatus);
      setPaymentStatus(result.data.paymentStatus);

      setSuccess("Order status updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update order."
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
            Loading order...
          </p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Order Not Found
          </h1>

          <p className="mt-3 text-red-600">
            {error || "Order could not be loaded."}
          </p>

          <Link
            href="/admin"
            className="mt-6 inline-block rounded-xl bg-blue-700 px-5 py-3 font-extrabold text-white"
          >
            ← Dashboard
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
              Order Details
            </h1>

            <p className="mt-2 font-bold text-slate-600">
              {order.orderNumber}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/customers/${order.customer.id}`}
              className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-700 shadow-sm"
            >
              ← Customer
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

        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 font-semibold text-green-700">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">

          <section className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">

            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Order Number
                </p>

                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                  {order.orderNumber}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {new Date(order.createdAt).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="flex gap-2">
                <span className="rounded-full bg-yellow-100 px-4 py-2 text-xs font-extrabold text-yellow-700">
                  {order.orderStatus}
                </span>

                <span className="rounded-full bg-blue-100 px-4 py-2 text-xs font-extrabold text-blue-700">
                  {order.paymentStatus}
                </span>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[650px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="pb-3">Product</th>
                    <th className="pb-3">Qty</th>
                    <th className="pb-3">Unit Price</th>
                    <th className="pb-3 text-right">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {order.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100"
                    >
                      <td className="py-4">
                        <p className="font-extrabold text-slate-900">
                          {item.productName}
                        </p>

                        <p className="text-xs text-slate-500">
                          {item.unit}
                        </p>
                      </td>

                      <td className="py-4 font-bold text-slate-700">
                        {item.quantity}
                      </td>

                      <td className="py-4 font-bold text-slate-700">
                        ₹{item.sellingPrice.toFixed(2)}
                      </td>

                      <td className="py-4 text-right font-extrabold text-slate-900">
                        ₹{item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 ml-auto max-w-sm space-y-3">

              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-bold">
                  ₹{order.subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Delivery</span>
                <span className="font-bold">
                  ₹{order.deliveryCharge.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>GST</span>
                <span className="font-bold">
                  ₹{order.gstAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-3 text-xl">
                <span className="font-extrabold text-slate-900">
                  Total
                </span>

                <span className="font-extrabold text-green-700">
                  ₹{order.totalAmount.toFixed(2)}
                </span>
              </div>

            </div>

            {order.notes && (
              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Notes
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {order.notes}
                </p>
              </div>
            )}

          </section>

          <div className="space-y-6">

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-extrabold text-slate-900">
                Update Order
              </h2>

              <div className="mt-5">

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Order Status
                </label>

                <select
                  value={orderStatus}
                  onChange={(e) =>
                    setOrderStatus(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-blue-500"
                >
                  {ORDER_STATUSES.map((status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ))}
                </select>

              </div>

              <div className="mt-5">

                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Payment Status
                </label>

                <select
                  value={paymentStatus}
                  onChange={(e) =>
                    setPaymentStatus(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-blue-500"
                >
                  {PAYMENT_STATUSES.map((status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ))}
                </select>

              </div>

              <button
                type="button"
                onClick={updateStatus}
                disabled={saving}
                className="mt-6 w-full rounded-xl bg-blue-700 px-5 py-3 font-extrabold text-white hover:bg-blue-800 disabled:bg-slate-300"
              >
                {saving
                  ? "Updating..."
                  : "Update Status"}
              </button>

            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">

              <h2 className="text-xl font-extrabold text-slate-900">
                Customer
              </h2>

              <div className="mt-5 space-y-4">

                <div>
                  <p className="text-xs font-bold text-slate-500">
                    Name
                  </p>

                  <p className="mt-1 font-extrabold text-slate-900">
                    {order.customer.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500">
                    Phone
                  </p>

                  <p className="mt-1 font-extrabold text-slate-900">
                    {order.customer.phone}
                  </p>
                </div>

                {order.customer.email && (
                  <div>
                    <p className="text-xs font-bold text-slate-500">
                      Email
                    </p>

                    <p className="mt-1 font-bold text-slate-700">
                      {order.customer.email}
                    </p>
                  </div>
                )}

                {order.customer.companyName && (
                  <div>
                    <p className="text-xs font-bold text-slate-500">
                      Company
                    </p>

                    <p className="mt-1 font-extrabold text-slate-900">
                      {order.customer.companyName}
                    </p>
                  </div>
                )}

              </div>

            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">

              <h2 className="text-xl font-extrabold text-slate-900">
                Shipping
              </h2>

              <div className="mt-5 space-y-3 text-sm">

                <p className="font-bold text-slate-900">
                  {order.shippingName}
                </p>

                <p className="text-slate-600">
                  {order.shippingPhone}
                </p>

                {order.shippingAddress && (
                  <p className="text-slate-600">
                    {order.shippingAddress}
                  </p>
                )}

                {(order.shippingCity ||
                  order.shippingState ||
                  order.shippingPincode) && (
                  <p className="text-slate-600">
                    {[
                      order.shippingCity,
                      order.shippingState,
                      order.shippingPincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}

              </div>

            </section>

          </div>
        </div>
      </div>
    </main>
  );
}
