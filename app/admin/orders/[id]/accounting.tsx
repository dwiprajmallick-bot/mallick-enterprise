"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Order = {
  id: string;
  orderNumber: string;
  customerId: string;
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
  createdAt: string;
  updatedAt: string;
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

type ApiResponse = {
  success: boolean;
  order?: Order;
  payments?: Payment[];
  ledger?: LedgerEntry[];
  returns?: SalesReturn[];
  creditNotes?: CreditNote[];
  error?: string;
};

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);

const moneyRupees = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const dateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function OrderAccountingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then((value) => setOrderId(value.id));
  }, [params]);

  async function loadData(id: string) {
    try {
      setLoading(true);
      setError("");

      const orderResponse = await fetch(
        `/api/admin/orders/${id}`,
        { cache: "no-store" }
      );

      const orderData =
        (await orderResponse.json()) as ApiResponse;

      if (!orderResponse.ok || !orderData.success) {
        throw new Error(
          orderData.error || "Failed to load order."
        );
      }

      setOrder(orderData.order || null);

      const paymentResponse = await fetch(
        `/api/admin/payments?orderId=${encodeURIComponent(id)}`,
        { cache: "no-store" }
      );

      if (paymentResponse.ok) {
        const paymentData =
          (await paymentResponse.json()) as ApiResponse;

        if (paymentData.success) {
          setPayments(paymentData.payments || []);
        }
      }

      if (orderData.order?.customerId) {
        const ledgerResponse = await fetch(
          `/api/admin/customers/${orderData.order.customerId}/ledger`,
          { cache: "no-store" }
        );

        if (ledgerResponse.ok) {
          const ledgerData = await ledgerResponse.json();

          if (ledgerData.success) {
            const entries = Array.isArray(ledgerData.ledger)
              ? ledgerData.ledger
              : [];

            setLedger(
              entries.filter(
                (entry: LedgerEntry) =>
                  entry.orderId === id ||
                  entry.referenceId === id
              )
            );
          }
        }
      }

      const returnResponse = await fetch(
        `/api/admin/returns?orderId=${encodeURIComponent(id)}`,
        { cache: "no-store" }
      );

      if (returnResponse.ok) {
        const returnData =
          (await returnResponse.json()) as ApiResponse;

        if (returnData.success) {
          setReturns(returnData.returns || []);
        }
      }

      const creditNoteResponse = await fetch(
        `/api/admin/invoices/${id}/credit-notes`,
        { cache: "no-store" }
      );

      if (creditNoteResponse.ok) {
        const creditNoteData =
          (await creditNoteResponse.json()) as ApiResponse;

        if (creditNoteData.success) {
          setCreditNotes(creditNoteData.creditNotes || []);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load sales accounting."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orderId) {
      loadData(orderId);
    }
  }, [orderId]);

  const accounting = useMemo(() => {
    const successfulReceipts = payments
      .filter((payment) => payment.status === "SUCCESS")
      .filter(
        (payment) =>
          payment.type === "RECEIVE" ||
          payment.type === "RECEIVE_REVERSAL"
      )
      .reduce((sum, payment) => {
        if (payment.type === "RECEIVE_REVERSAL") {
          return sum - payment.amountPaise;
        }

        return sum + payment.amountPaise;
      }, 0);

    const refundPayments = payments
      .filter(
        (payment) =>
          payment.status === "SUCCESS" &&
          payment.type === "REFUND"
      )
      .reduce(
        (sum, payment) => sum + payment.amountPaise,
        0
      );

    const refundReversals = payments
      .filter(
        (payment) =>
          payment.status === "SUCCESS" &&
          payment.type === "REFUND_REVERSAL"
      )
      .reduce(
        (sum, payment) => sum + payment.amountPaise,
        0
      );

    const netReceivable =
      (order?.totalAmount || 0) * 100 -
      successfulReceipts +
      refundPayments -
      refundReversals;

    const activeReturns = returns
      .filter((item) => item.status !== "CANCELLED")
      .reduce(
        (sum, item) => sum + item.totalAmount * 100,
        0
      );

    const activeCreditNotes = creditNotes
      .filter((item) => item.status !== "CANCELLED")
      .reduce(
        (sum, item) => sum + item.totalAmountPaise,
        0
      );

    return {
      successfulReceipts,
      refundPayments,
      refundReversals,
      netReceivable: Math.max(0, netReceivable),
      activeReturns,
      activeCreditNotes,
    };
  }, [payments, returns, creditNotes, order]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-10 text-center text-slate-500 shadow-sm">
          Loading sales accounting...
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-10 text-center">
          <p className="font-bold text-red-600">
            {error || "Order not found."}
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
              Sales Accounting Control
            </p>

            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
              {order.orderNumber}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Complete customer-side accounting and transaction trace.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/orders/${order.id}`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Order Details
            </Link>

            <Link
              href={`/admin/customers/${order.customerId}/ledger`}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Customer Ledger
            </Link>
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
              Order Total
            </p>
            <p className="mt-2 text-2xl font-extrabold">
              {moneyRupees(order.totalAmount)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Customer Received
            </p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-700">
              {money(accounting.successfulReceipts)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Refunds
            </p>
            <p className="mt-2 text-2xl font-extrabold text-orange-700">
              {money(accounting.refundPayments)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Credit Notes
            </p>
            <p className="mt-2 text-2xl font-extrabold text-purple-700">
              {money(accounting.activeCreditNotes)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Net Receivable
            </p>
            <p className="mt-2 text-2xl font-extrabold text-red-700">
              {money(accounting.netReceivable)}
            </p>
          </div>

        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-extrabold text-slate-900">
            Sales Financial Summary
          </h2>

          <div className="mt-5 space-y-3 text-sm">

            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">
                Subtotal
              </span>
              <span className="font-bold">
                {moneyRupees(order.subtotal)}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">
                Delivery Charge
              </span>
              <span className="font-bold">
                {moneyRupees(order.deliveryCharge)}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">
                GST
              </span>
              <span className="font-bold">
                {moneyRupees(order.gstAmount)}
              </span>
            </div>

            <div className="flex justify-between text-lg">
              <span className="font-extrabold">
                Total
              </span>
              <span className="font-extrabold">
                {moneyRupees(order.totalAmount)}
              </span>
            </div>

          </div>

        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-extrabold">
              Customer Payment Trace
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Receipts, refunds and reversals remain separately traceable.
            </p>
          </div>

          {payments.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No payment records linked to this order.
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
              Sales Return Trace
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Returned goods, refund status and financial impact.
            </p>
          </div>

          {returns.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No sales returns linked to this order.
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
                        {moneyRupees(item.totalAmount)}
                      </td>

                      <td className="px-6 py-4">
                        {item.status}
                      </td>

                      <td className="px-6 py-4">
                        {item.refundStatus}
                        {item.refundAmount > 0 && (
                          <span className="ml-2 font-bold">
                            {moneyRupees(item.refundAmount)}
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

            <p className="mt-1 text-sm text-slate-500">
              Credit notes associated with the sales transaction.
            </p>
          </div>

          {creditNotes.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No credit notes linked to this transaction.
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
                    <th className="px-6 py-4">Invoice</th>
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
                        {note.invoiceId || "—"}
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
              Customer Ledger Trace
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Ledger entries directly associated with this order.
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
                          ? `${entry.referenceType}: ${entry.referenceId || ""}`
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

          <h2 className="text-lg font-extrabold text-slate-900">
            Transaction Control Chain
          </h2>

          <div className="mt-5 grid gap-3 md:grid-cols-6">

            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-xs font-bold uppercase text-slate-400">
                01
              </p>
              <p className="mt-2 font-extrabold">
                Order
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-xs font-bold uppercase text-slate-400">
                02
              </p>
              <p className="mt-2 font-extrabold">
                Invoice
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-xs font-bold uppercase text-slate-400">
                03
              </p>
              <p className="mt-2 font-extrabold">
                Receipt
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-xs font-bold uppercase text-slate-400">
                04
              </p>
              <p className="mt-2 font-extrabold">
                Return
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-xs font-bold uppercase text-slate-400">
                05
              </p>
              <p className="mt-2 font-extrabold">
                Refund
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-xs font-bold uppercase text-slate-400">
                06
              </p>
              <p className="mt-2 font-extrabold">
                Credit Note
              </p>
            </div>

          </div>

        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">

          <h2 className="text-lg font-extrabold text-slate-900">
            Audit & Accounting Controls
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-4">

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                Immutable History
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Accounting events are preserved rather than silently overwritten.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                Reversal
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Corrections should create separate reversal events.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                Traceability
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Order, payment, return and ledger records remain linked.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                Customer Account
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Customer receivable is visible through the ledger.
              </p>
            </div>

          </div>

        </section>

      </div>
    </main>
  );
}