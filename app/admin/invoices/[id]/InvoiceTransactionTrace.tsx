"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TraceData = {
  orders: Array<{
    id: string;
    orderNumber: string;
    subtotal: number;
    gstAmount: number;
    totalAmount: number;
    paymentStatus: string;
    orderStatus: string;
    createdAt: string;
  }>;

  salesReturns: Array<{
    id: string;
    returnNumber: string;
    status: string;
    reason: string;
    totalAmount: number;
    refundStatus: string;
    refundAmount: number;
    createdAt: string;
  }>;

  creditNotes: Array<{
    id: string;
    creditNoteNumber: string;
    salesReturnId: string;
    orderId: string;
    status: string;
    taxableAmountPaise: number;
    totalGstPaise: number;
    totalAmountPaise: number;
    reason: string;
    issuedAt: string;
    gstRecords: Array<{
      id: string;
      gstNumber: string;
      entryType: string;
      taxablePaise: number;
      gstPaise: number;
      status: string;
      createdAt: string;
    }>;
  }>;

  gstRecords: Array<{
    id: string;
    gstNumber: string;
    entryType: string;
    sourceType: string;
    sourceId: string;
    taxablePaise: number;
    gstPaise: number;
    status: string;
    createdAt: string;
  }>;

  payments: Array<{
    id: string;
    paymentNumber: string;
    amountPaise: number;
    method: string;
    status: string;
    paidAt: string;
  }>;

  ledgerEntries: Array<{
    id: string;
    ledgerNumber: string;
    entryType: string;
    accountType: string;
    amountPaise: number;
    description: string;
    referenceType: string | null;
    transactionAt: string;
  }>;
};

type Props = {
  invoiceId: string;
};

function moneyPaise(value: number) {
  return `₹${(Number(value || 0) / 100).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function date(value: string) {
  return new Date(value).toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

export default function InvoiceTransactionTrace({
  invoiceId,
}: Props) {
  const [data, setData] = useState<TraceData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/admin/invoices/${invoiceId}/trace`,
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
              "Failed to load transaction trace."
          );
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load transaction trace."
        );
      } finally {
        setLoading(false);
      }
    }

    if (invoiceId) {
      load();
    }
  }, [invoiceId]);

  if (loading) {
    return (
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">
          Loading transaction trace...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-xl font-extrabold text-red-800">
          Transaction Trace
        </h2>
        <p className="mt-2 text-sm text-red-700">
          {error}
        </p>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Financial Trace
        </p>

        <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
          Invoice Transaction Trace
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Complete traceability from invoice through returns,
          credit notes, GST, refunds and ledger entries.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">
            Orders
          </p>
          <p className="mt-2 text-2xl font-extrabold">
            {data.orders.length}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">
            Returns
          </p>
          <p className="mt-2 text-2xl font-extrabold">
            {data.salesReturns.length}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">
            Credit Notes
          </p>
          <p className="mt-2 text-2xl font-extrabold">
            {data.creditNotes.length}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">
            Refunds
          </p>
          <p className="mt-2 text-2xl font-extrabold">
            {data.payments.length}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">
            Ledger
          </p>
          <p className="mt-2 text-2xl font-extrabold">
            {data.ledgerEntries.length}
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="rounded-2xl border border-slate-200 p-5">
          <h3 className="font-extrabold text-slate-900">
            1. Order
          </h3>

          <div className="mt-4 space-y-3">
            {data.orders.length === 0 ? (
              <p className="text-sm text-slate-500">
                No linked order found in the trace.
              </p>
            ) : (
              data.orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-extrabold">
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-slate-500">
                      {date(order.createdAt)}
                    </p>
                  </div>

                  <div className="text-sm">
                    Total:{" "}
                    <span className="font-extrabold">
                      {money(order.totalAmount)}
                    </span>
                  </div>

                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-center text-xs font-bold text-white"
                  >
                    View Order
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <h3 className="font-extrabold text-slate-900">
            2. Sales Returns
          </h3>

          <div className="mt-4 space-y-3">
            {data.salesReturns.length === 0 ? (
              <p className="text-sm text-slate-500">
                No Sales Return linked to this invoice.
              </p>
            ) : (
              data.salesReturns.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-extrabold">
                      {item.returnNumber}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.reason}
                    </p>
                  </div>

                  <div className="text-sm">
                    <span className="font-bold">
                      {item.status}
                    </span>
                    {" • "}
                    {money(item.totalAmount)}
                  </div>

                  <Link
                    href={`/admin/returns/${item.id}`}
                    className="rounded-xl bg-blue-700 px-4 py-2 text-center text-xs font-bold text-white"
                  >
                    View Return
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <h3 className="font-extrabold text-slate-900">
            3. Credit Notes
          </h3>

          <div className="mt-4 space-y-3">
            {data.creditNotes.length === 0 ? (
              <p className="text-sm text-slate-500">
                No Credit Note linked to this invoice.
              </p>
            ) : (
              data.creditNotes.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-extrabold">
                        {item.creditNoteNumber}
                      </p>

                      <p className="text-xs text-slate-500">
                        {item.reason}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                        item.status === "CANCELLED"
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {item.status}
                    </span>

                    <Link
                      href={`/admin/credit-notes/${item.salesReturnId}`}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-center text-xs font-bold text-white"
                    >
                      View Credit Note
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        Taxable
                      </p>
                      <p className="font-extrabold">
                        {moneyPaise(
                          item.taxableAmountPaise
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        GST
                      </p>
                      <p className="font-extrabold">
                        {moneyPaise(
                          item.totalGstPaise
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Total Credit
                      </p>
                      <p className="font-extrabold">
                        {moneyPaise(
                          item.totalAmountPaise
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <h3 className="font-extrabold text-slate-900">
            4. GST Records
          </h3>

          <div className="mt-4 overflow-x-auto">
            {data.gstRecords.length === 0 ? (
              <p className="text-sm text-slate-500">
                No GST adjustment record found.
              </p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <th className="px-3 py-3">
                      GST Number
                    </th>
                    <th className="px-3 py-3">
                      Type
                    </th>
                    <th className="px-3 py-3">
                      Taxable
                    </th>
                    <th className="px-3 py-3">
                      GST
                    </th>
                    <th className="px-3 py-3">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.gstRecords.map((gst) => (
                    <tr
                      key={gst.id}
                      className="border-b border-slate-100"
                    >
                      <td className="px-3 py-3 font-bold">
                        {gst.gstNumber}
                      </td>
                      <td className="px-3 py-3">
                        {gst.entryType}
                      </td>
                      <td className="px-3 py-3">
                        {moneyPaise(
                          gst.taxablePaise
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {moneyPaise(gst.gstPaise)}
                      </td>
                      <td className="px-3 py-3">
                        {gst.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <h3 className="font-extrabold text-slate-900">
            5. Refund / Payment
          </h3>

          <div className="mt-4 space-y-3">
            {data.payments.length === 0 ? (
              <p className="text-sm text-slate-500">
                No refund payment recorded.
              </p>
            ) : (
              data.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col gap-2 rounded-xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-extrabold">
                      {payment.paymentNumber}
                    </p>
                    <p className="text-xs text-slate-500">
                      {payment.method} •{" "}
                      {date(payment.paidAt)}
                    </p>
                  </div>

                  <p className="font-extrabold">
                    {moneyPaise(payment.amountPaise)}
                  </p>

                  <span className="text-xs font-bold">
                    {payment.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <h3 className="font-extrabold text-slate-900">
            6. Ledger
          </h3>

          <div className="mt-4 space-y-3">
            {data.ledgerEntries.length === 0 ? (
              <p className="text-sm text-slate-500">
                No linked ledger entry found.
              </p>
            ) : (
              data.ledgerEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-extrabold">
                        {entry.ledgerNumber}
                      </p>

                      <p className="text-xs text-slate-500">
                        {entry.entryType} •{" "}
                        {entry.accountType}
                      </p>
                    </div>

                    <p className="font-extrabold">
                      {moneyPaise(entry.amountPaise)}
                    </p>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    {entry.description}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {entry.referenceType || "No reference"} •{" "}
                    {date(entry.transactionAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-900">
          Audit principle
        </p>

        <p className="mt-1 text-xs leading-5 text-amber-800">
          This screen is a trace view only. Financial records are
          not edited or deleted from this panel. Corrections must
          follow the dedicated reversal/cancellation workflow so
          the transaction history remains traceable.
        </p>
      </div>
    </section>
  );
}