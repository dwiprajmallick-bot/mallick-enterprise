"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  sellingPrice: number;
  totalPrice: number;
};

type Customer = {
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
  paymentMethod: string;
  orderStatus: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  createdAt: string;
  customer: Customer;
  items: OrderItem[];
};

export default function InvoicePage() {
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInvoice() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/admin/orders/${id}/invoice`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Failed to load invoice"
          );
        }

        setOrder(data.invoice);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load invoice"
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadInvoice();
    }
  }, [id]);

  function formatMoney(amount: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-10 text-center shadow-sm">
          <p className="font-bold text-slate-600">
            Loading invoice...
          </p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-extrabold text-red-600">
            Invoice Error
          </h1>

          <p className="mt-2 text-slate-600">
            {error || "Invoice not found"}
          </p>

          <Link
            href={`/admin/orders/${id}`}
            className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-3 font-bold text-white"
          >
            ← Back to Order
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex flex-wrap justify-between gap-3 print:hidden">
          <Link
            href={`/admin/orders/${order.id}`}
            className="rounded-xl bg-white px-5 py-3 font-bold text-slate-700 shadow-sm"
          >
            ← Back to Order
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white"
          >
            Print / Save PDF
          </button>
        </div>

        <div className="bg-white p-6 shadow-sm md:p-10">
          <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-6 md:flex-row">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">
                OFFICEKART
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Office Stationery & Business Supplies
              </p>

              <p className="mt-3 text-sm text-slate-600">
                GST Invoice
              </p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-sm font-bold text-slate-500">
                INVOICE
              </p>

              <p className="mt-1 text-xl font-extrabold text-slate-900">
                {order.orderNumber}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Date: {formatDate(order.createdAt)}
              </p>

              <p className="mt-1 text-sm font-bold text-slate-700">
                Payment: {order.paymentStatus}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 border-b border-slate-200 py-7 md:grid-cols-2">
            <div>
              <h2 className="mb-3 text-sm font-extrabold uppercase text-slate-400">
                Bill To
              </h2>

              <p className="font-extrabold text-slate-900">
                {order.customer.companyName ||
                  order.customer.name}
              </p>

              {order.customer.companyName && (
                <p className="mt-1 text-sm text-slate-700">
                  Contact: {order.customer.name}
                </p>
              )}

              <p className="mt-1 text-sm text-slate-700">
                Phone: {order.customer.phone}
              </p>

              {order.customer.email && (
                <p className="mt-1 break-all text-sm text-slate-700">
                  Email: {order.customer.email}
                </p>
              )}

              {order.customer.gstin && (
                <p className="mt-1 font-mono text-sm font-bold text-slate-700">
                  GSTIN: {order.customer.gstin}
                </p>
              )}
            </div>

            <div>
              <h2 className="mb-3 text-sm font-extrabold uppercase text-slate-400">
                Ship To
              </h2>

              <p className="font-extrabold text-slate-900">
                {order.shippingName}
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {order.shippingPhone}
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-700">
                {order.shippingAddress}
                <br />
                {order.shippingCity}
                <br />
                {order.shippingState} -{" "}
                {order.shippingPincode}
              </p>
            </div>
          </div>

          <div className="py-7">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-sm text-slate-500">
                    <th className="px-3 py-3 font-extrabold">
                      #
                    </th>

                    <th className="px-3 py-3 font-extrabold">
                      Product
                    </th>

                    <th className="px-3 py-3 text-right font-extrabold">
                      Qty
                    </th>

                    <th className="px-3 py-3 text-right font-extrabold">
                      Rate
                    </th>

                    <th className="px-3 py-3 text-right font-extrabold">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {order.items.map((item, index) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100"
                    >
                      <td className="px-3 py-4 text-sm text-slate-500">
                        {index + 1}
                      </td>

                      <td className="px-3 py-4">
                        <p className="font-bold text-slate-900">
                          {item.productName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Unit: {item.unit}
                        </p>
                      </td>

                      <td className="px-3 py-4 text-right font-bold text-slate-700">
                        {item.quantity}
                      </td>

                      <td className="px-3 py-4 text-right text-sm text-slate-700">
                        {formatMoney(item.sellingPrice)}
                      </td>

                      <td className="px-3 py-4 text-right font-extrabold text-slate-900">
                        {formatMoney(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 ml-auto max-w-sm space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  Subtotal
                </span>

                <span className="font-bold">
                  {formatMoney(order.subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  Delivery Charge
                </span>

                <span className="font-bold">
                  {formatMoney(order.deliveryCharge)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  GST
                </span>

                <span className="font-bold">
                  {formatMoney(order.gstAmount)}
                </span>
              </div>

              <div className="flex justify-between border-t-2 border-slate-900 pt-4">
                <span className="text-lg font-extrabold">
                  Grand Total
                </span>

                <span className="text-xl font-extrabold text-blue-600">
                  {formatMoney(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 text-center">
            <p className="text-sm font-bold text-slate-700">
              Thank you for doing business with OFFICEKART.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              This invoice is generated electronically.
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          main {
            padding: 0 !important;
          }

          main > div {
            max-width: none !important;
          }

          main > div > div {
            box-shadow: none !important;
          }
        }
      `}</style>
    </main>
  );
}
