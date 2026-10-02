"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Invoice = {
  id: string;
  invoiceNumber?: string | null;
  number?: string | null;
  orderId?: string | null;
  customerId?: string | null;
  status?: string | null;
  subtotalPaise?: number | null;
  gstPaise?: number | null;
  totalPaise?: number | null;
  createdAt?: string | null;
  issuedAt?: string | null;
  [key: string]: unknown;
};

type Payment = {
  id: string;
  paymentNumber: string;
  type: string;
  status: string;
  orderId?: string | null;
  amountPaise: number;
  method: string;
  reference?: string | null;
  paidAt: string;
};

type SalesReturn = {
  id: string;
  returnNumber: string;
  orderId: string;
  status: string;
  reason: string;
  totalAmount: number;
  refundStatus: string;
  refundAmount: number;
  createdAt: string;
};

type CreditNote = {
  id: string;
  creditNoteNumber: string;
  salesReturnId: string;
  orderId: string;
  invoiceId?: string | null;
  status: string;
  taxableAmountPaise: number;
  totalGstPaise: number;
  totalAmountPaise: number;
  reason: string;
  issuedAt: string;
};

type GstRecord = {
  id: string;
  gstNumber: string;
  entryType: string;
  sourceType: string;
  sourceId: string;
  gstRate: number;
  taxablePaise: number;
  gstPaise: number;
  status: string;
  createdAt: string;
};

type LedgerEntry = {
  id: string;
  ledgerNumber: string;
  entryType: string;
  accountType: string;
  accountId?: string | null;
  orderId?: string | null;
  paymentId?: string | null;
  amountPaise: number;
  description: string;
  referenceType?: string | null;
  referenceId?: string | null;
  transactionAt: string;
};

type ApiResponse = {
  success: boolean;
  invoice?: Invoice;
  payments?: Payment[];
  returns?: SalesReturn[];
  creditNotes?: CreditNote[];
  gstRecords?: GstRecord[];
  ledger?: LedgerEntry[];
  error?: string;
};

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);

const dateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

export default function InvoiceAccountingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [invoiceId, setInvoiceId] = useState("");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [gstRecords, setGstRecords] = useState<GstRecord[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then((value) => setInvoiceId(value.id));
  }, [params]);

  async function getJson(
    url: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return data && typeof data === "object" ? data : null;
    } catch {
      return null;
    }
  }

  async function loadData(id: string) {
    try {
      setLoading(true);
      setError("");

      const invoiceData = await getJson(
        `/api/admin/invoices/${id}`
      );

      if (!invoiceData?.success) {
        throw new Error(
          String(
            invoiceData?.error ||
              "Failed to load invoice."
          )
        );
      }

      const loadedInvoice =
        (invoiceData.invoice as Invoice | undefined) ||
        (invoiceData.data as Invoice | undefined);

      if (!loadedInvoice) {
        throw new Error("Invoice record was not returned.");
      }

      setInvoice(loadedInvoice);

      const orderId =
        typeof loadedInvoice.orderId === "string"
          ? loadedInvoice.orderId
          : "";

      const customerId =
        typeof loadedInvoice.customerId === "string"
          ? loadedInvoice.customerId
          : "";

      const [
        creditNoteData,
        salesReturnData,
        gstData,
      ] = await Promise.all([
        getJson(
          `/api/admin/invoices/${id}/credit-notes`
        ),
        getJson(
          `/api/admin/invoices/${id}/sales-returns`
        ),
        getJson(
          `/api/admin/invoices/${id}/gst`
        ),
      ]);

      if (creditNoteData?.success) {
        setCreditNotes(
          Array.isArray(creditNoteData.creditNotes)
            ? (creditNoteData.creditNotes as CreditNote[])
            : []
        );
      }

      if (salesReturnData?.success) {
        setReturns(
          Array.isArray(salesReturnData.salesReturns)
            ? (salesReturnData.salesReturns as SalesReturn[])
            : Array.isArray(salesReturnData.returns)
              ? (salesReturnData.returns as SalesReturn[])
              : []
        );
      }

      if (gstData?.success) {
        setGstRecords(
          Array.isArray(gstData.gstRecords)
            ? (gstData.gstRecords as GstRecord[])
            : Array.isArray(gstData.records)
              ? (gstData.records as GstRecord[])
              : []
        );
      }

      if (orderId) {
        const paymentData = await getJson(
          `/api/admin/payments?orderId=${encodeURIComponent(
            orderId
          )}`
        );

        if (paymentData?.success) {
          setPayments(
            Array.isArray(paymentData.payments)
              ? (paymentData.payments as Payment[])
              : []
          );
        }
      }

      if (customerId) {
        const ledgerData = await getJson(
          `/api/admin/customers/${encodeURIComponent(
            customerId
          )}/ledger`
        );

        if (ledgerData?.success) {
          const entries = Array.isArray(
            ledgerData.ledger
          )
            ? (ledgerData.ledger as LedgerEntry[])
            : [];

          setLedger(
            orderId
              ? entries.filter(
                  (entry) =>
                    entry.orderId === orderId ||
                    entry.referenceId === orderId
                )
              : []
          );
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load invoice accounting."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (invoiceId) {
      loadData(invoiceId);
    }
  }, [invoiceId]);

  const summary = useMemo(() => {
    const total =
      typeof invoice?.totalPaise === "number"
        ? invoice.totalPaise
        : 0;

    const received = payments
      .filter(
        (payment) =>
          payment.status === "SUCCESS" &&
          payment.type === "RECEIVE"
      )
      .reduce(
        (sum, payment) =>
          sum + payment.amountPaise,
        0
      );

    const receiveReversals = payments
      .filter(
        (payment) =>
          payment.status === "SUCCESS" &&
          payment.type === "RECEIVE_REVERSAL"
      )
      .reduce(
        (sum, payment) =>
          sum + payment.amountPaise,
        0
      );

    const refunds = payments
      .filter(
        (payment) =>
          payment.status === "SUCCESS" &&
          payment.type === "REFUND"
      )
      .reduce(
        (sum, payment) =>
          sum + payment.amountPaise,
        0
      );

    const refundReversals = payments
      .filter(
        (payment) =>
          payment.status === "SUCCESS" &&
          payment.type === "REFUND_REVERSAL"
      )
      .reduce(
        (sum, payment) =>
          sum + payment.amountPaise,
        0
      );

    const netReceived =
      received -
      receiveReversals -
      refunds +
      refundReversals;

    return {
      total,
      received,
      receiveReversals,
      refunds,
      refundReversals,
      outstanding: Math.max(
        0,
        total - netReceived
      ),
    };
  }, [invoice, payments]);

  const invoiceNumber =
    invoice?.invoiceNumber ||
    invoice?.number ||
    "Invoice";

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-10 text-center text-slate-500 shadow-sm">
          Loading invoice accounting...
        </div>
      </main>
    );
  }

  if (!invoice) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-10 text-center">
          <p className="font-bold text-red-600">
            {error || "Invoice not found."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
              Invoice Accounting & Trace
            </p>

            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
              {invoiceNumber}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Financial, GST and document relationship control.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/invoices/${invoice.id}`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Invoice Details
            </Link>

            {invoice.orderId && (
              <Link
                href={`/admin/orders/${invoice.orderId}`}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                View Order
              </Link>
            )}

            {invoice.customerId && (
              <Link
                href={`/admin/customers/${invoice.customerId}/ledger`}
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                Customer Ledger
              </Link>
            )}
          </div>
        </section>

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-5">

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Invoice Total
            </p>
            <p className="mt-2 text-2xl font-extrabold">
              {money(summary.total)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Net Received
            </p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-700">
              {money(
                summary.received -
                  summary.receiveReversals
              )}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Refunds
            </p>
            <p className="mt-2 text-2xl font-extrabold text-orange-700">
              {money(
                summary.refunds -
                  summary.refundReversals
              )}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Credit Notes
            </p>
            <p className="mt-2 text-2xl font-extrabold text-purple-700">
              {money(
                creditNotes
                  .filter(
                    (item) =>
                      item.status !== "CANCELLED"
                  )
                  .reduce(
                    (sum, item) =>
                      sum + item.totalAmountPaise,
                    0
                  )
              )}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Outstanding
            </p>
            <p className="mt-2 text-2xl font-extrabold text-red-700">
              {money(summary.outstanding)}
            </p>
          </div>

        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-extrabold text-slate-900">
            Invoice Financial Details
          </h2>

          <div className="mt-5 space-y-3 text-sm">

            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">
                Subtotal
              </span>
              <span className="font-bold">
                {money(
                  typeof invoice.subtotalPaise ===
                    "number"
                    ? invoice.subtotalPaise
                    : 0
                )}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">
                GST
              </span>
              <span className="font-bold">
                {money(
                  typeof invoice.gstPaise === "number"
                    ? invoice.gstPaise
                    : 0
                )}
              </span>
            </div>

            <div className="flex justify-between text-lg">
              <span className="font-extrabold">
                Invoice Total
              </span>
              <span className="font-extrabold">
                {money(summary.total)}
              </span>
            </div>

          </div>

        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-extrabold">
              Payment & Receipt Trace
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Customer receipts and reversals linked to the invoice order.
            </p>
          </div>

          {payments.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No payment records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Reference</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <tr key={payment.id}>

                      <td className="px-6 py-4 font-bold">
                        {payment.paymentNumber}
                      </td>

                      <td className="px-6 py-4">
                        {payment.type}
                      </td>

                      <td className="px-6 py-4 font-bold">
                        {money(payment.amountPaise)}
                      </td>

                      <td className="px-6 py-4">
                        {payment.method}
                      </td>

                      <td className="px-6 py-4">
                        {payment.reference || "—"}
                      </td>

                      <td className="px-6 py-4">
                        {payment.status}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                        {dateTime(payment.paidAt)}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-extrabold">
              Sales Return & Refund Trace
            </h2>
          </div>

          {returns.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No sales returns linked to this invoice.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Return</th>
                    <th className="px-6 py-4">Reason</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Refund</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {returns.map((item) => (
                    <tr key={item.id}>

                      <td className="px-6 py-4 font-bold">
                        {item.returnNumber}
                      </td>

                      <td className="px-6 py-4">
                        {item.reason}
                      </td>

                      <td className="px-6 py-4 font-bold">
                        ₹{item.totalAmount.toFixed(2)}
                      </td>

                      <td className="px-6 py-4">
                        {item.status}
                      </td>

                      <td className="px-6 py-4">
                        {item.refundStatus}
                        {item.refundAmount > 0 && (
                          <span className="ml-2 font-bold">
                            ₹{item.refundAmount.toFixed(2)}
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                        {dateTime(item.createdAt)}
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/returns/${item.id}`}
                          className="font-bold text-blue-600 hover:underline"
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

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-extrabold">
              Credit Note Trace
            </h2>
          </div>

          {creditNotes.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No credit notes linked to this invoice.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Credit Note</th>
                    <th className="px-6 py-4">Taxable</th>
                    <th className="px-6 py-4">GST</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Invoice Link</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {creditNotes.map((note) => (
                    <tr key={note.id}>

                      <td className="px-6 py-4 font-bold">
                        {note.creditNoteNumber}
                      </td>

                      <td className="px-6 py-4">
                        {money(note.taxableAmountPaise)}
                      </td>

                      <td className="px-6 py-4">
                        {money(note.totalGstPaise)}
                      </td>

                      <td className="px-6 py-4 font-bold">
                        {money(note.totalAmountPaise)}
                      </td>

                      <td className="px-6 py-4">
                        {note.status}
                      </td>

                      <td className="px-6 py-4">
                        {note.invoiceId ? "Linked" : "Not linked"}
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/credit-notes/${note.salesReturnId}`}
                          className="font-bold text-blue-600 hover:underline"
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

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-extrabold">
              GST Trace
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              GST records associated with the invoice transaction.
            </p>
          </div>

          {gstRecords.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No GST records returned by the invoice GST endpoint.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">GST No.</th>
                    <th className="px-6 py-4">Entry</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">Rate</th>
                    <th className="px-6 py-4">Taxable</th>
                    <th className="px-6 py-4">GST</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {gstRecords.map((record) => (
                    <tr key={record.id}>

                      <td className="px-6 py-4 font-bold">
                        {record.gstNumber}
                      </td>

                      <td className="px-6 py-4">
                        {record.entryType}
                      </td>

                      <td className="px-6 py-4">
                        {record.sourceType}
                      </td>

                      <td className="px-6 py-4">
                        {record.gstRate}%
                      </td>

                      <td className="px-6 py-4">
                        {money(record.taxablePaise)}
                      </td>

                      <td className="px-6 py-4 font-bold">
                        {money(record.gstPaise)}
                      </td>

                      <td className="px-6 py-4">
                        {record.status}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-extrabold">
              Customer Ledger Trace
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Customer accounting entries associated with the invoice order.
            </p>
          </div>

          {ledger.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No directly linked ledger entries found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Ledger</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Reference</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {ledger.map((entry) => (
                    <tr key={entry.id}>

                      <td className="px-6 py-4 font-bold">
                        {entry.ledgerNumber}
                      </td>

                      <td className="px-6 py-4">
                        {entry.entryType}
                      </td>

                      <td className="px-6 py-4 font-bold">
                        {money(entry.amountPaise)}
                      </td>

                      <td className="px-6 py-4">
                        {entry.description}
                      </td>

                      <td className="px-6 py-4">
                        {entry.referenceType
                          ? `${entry.referenceType}: ${
                              entry.referenceId || ""
                            }`
                          : "—"}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                        {dateTime(entry.transactionAt)}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">

          <h2 className="text-lg font-extrabold">
            Document Trace Chain
          </h2>

          <div className="mt-5 grid gap-3 md:grid-cols-7">

            {[
              "Order",
              "Invoice",
              "GST",
              "Receipt",
              "Return",
              "Refund",
              "Credit Note",
            ].map((item, index) => (
              <div
                key={item}
                className="rounded-2xl bg-slate-50 p-4 text-center"
              >
                <p className="text-xs font-bold uppercase text-slate-400">
                  {String(index + 1).padStart(2, "0")}
                </p>

                <p className="mt-2 font-extrabold">
                  {item}
                </p>
              </div>
            ))}

          </div>

        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">

          <h2 className="text-lg font-extrabold">
            Accounting Control
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-4">

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                Invoice
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Original sales document remains separately identifiable.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                Receipt
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Customer receipts are recorded independently from the invoice.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                Correction
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Refunds and reversals remain separate accounting events.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                Audit
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Financial records should remain traceable from source to correction.
              </p>
            </div>

          </div>

        </section>

      </div>
    </main>
  );
}