"use client";

import {
  useEffect,
  useState,
} from "react";

import BusinessNav from "../_components/BusinessNav";

type Invoice = {
  id: string;
  invoiceNumber: string;
  orderId: string;
  customerId: string | null;
  status: string;
  paymentStatus: string;
  subtotalPaise: number;
  gstPaise: number;
  deliveryPaise: number;
  totalPaise: number;
  issuedAt: string;
};

type Order = {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
};

function money(paise: number) {
  return `₹${(
    Number(paise || 0) / 100
  ).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function InvoicesPage() {
  const [
    invoices,
    setInvoices,
  ] = useState<Invoice[]>([]);

  const [
    orders,
    setOrders,
  ] = useState<Order[]>([]);

  const [
    selectedOrder,
    setSelectedOrder,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  async function load() {
    setError("");

    try {
      const [
        invoiceResponse,
        orderResponse,
      ] = await Promise.all([
        fetch(
          "/api/admin/invoices",
          {
            credentials:
              "include",
          }
        ),
        fetch(
          "/api/admin/orders",
          {
            credentials:
              "include",
          }
        ),
      ]);

      const invoiceData =
        await invoiceResponse.json();

      const orderData =
        await orderResponse.json();

      if (
        !invoiceResponse.ok ||
        !invoiceData.success
      ) {
        throw new Error(
          invoiceData.message ||
            "Unable to load invoices."
        );
      }

      if (
        !orderResponse.ok ||
        !orderData.success
      ) {
        throw new Error(
          orderData.message ||
            "Unable to load orders."
        );
      }

      setInvoices(
        invoiceData.invoices
      );

      setOrders(
        orderData.orders
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load invoice data."
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createInvoice() {
    if (!selectedOrder) {
      setError(
        "Select an order first."
      );
      return;
    }

    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/invoices",
          {
            method: "POST",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                orderId:
                  selectedOrder,
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
          data.message ||
            "Invoice creation failed."
        );
      }

      setMessage(
        `Invoice ${data.invoice.invoiceNumber} created.`
      );

      setSelectedOrder("");

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invoice creation failed."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <BusinessNav />

      <div className="mx-auto max-w-7xl p-6">
        <h1 className="text-3xl font-bold">
          Invoices
        </h1>

        {message ? (
          <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-3 md:flex-row">
            <select
              value={
                selectedOrder
              }
              onChange={(e) =>
                setSelectedOrder(
                  e.target.value
                )
              }
              className="flex-1 rounded-xl border px-4 py-3"
            >
              <option value="">
                Select order to invoice
              </option>

              {orders
                .filter(
                  (order) =>
                    order.orderStatus !==
                      "CANCELLED" &&
                    !invoices.some(
                      (invoice) =>
                        invoice.orderId ===
                        order.id
                    )
                )
                .map(
                  (order) => (
                    <option
                      key={order.id}
                      value={
                        order.id
                      }
                    >
                      {
                        order.orderNumber
                      }{" "}
                      — ₹
                      {
                        order.totalAmount
                      }
                    </option>
                  )
                )}
            </select>

            <button
              type="button"
              onClick={
                createInvoice
              }
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
            >
              Issue Invoice
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left">
                  Invoice
                </th>
                <th className="p-3 text-left">
                  Order
                </th>
                <th className="p-3 text-left">
                  Tax
                </th>
                <th className="p-3 text-left">
                  Total
                </th>
                <th className="p-3 text-left">
                  Payment
                </th>
                <th className="p-3 text-left">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {invoices.map(
                (invoice) => (
                  <tr
                    key={
                      invoice.id
                    }
                    className="border-t"
                  >
                    <td className="p-3 font-medium">
                      {
                        invoice.invoiceNumber
                      }
                    </td>

                    <td className="p-3">
                      {
                        invoice.orderId
                      }
                    </td>

                    <td className="p-3">
                      {money(
                        invoice.gstPaise
                      )}
                    </td>

                    <td className="p-3">
                      {money(
                        invoice.totalPaise
                      )}
                    </td>

                    <td className="p-3">
                      {
                        invoice.paymentStatus
                      }
                    </td>

                    <td className="p-3">
                      {
                        invoice.status
                      }
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}