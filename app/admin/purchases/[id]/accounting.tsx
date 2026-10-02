"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Purchase = {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  status: string;
  subtotalPaise: number;
  gstPaise: number;
  deliveryPaise: number;
  totalPaise: number;
  paymentStatus: string;
  purchasedAt: string;
  notes?: string | null;
};

type Payment = {
  id: string;
  paymentNumber: string;
  type: string;
  status: string;
  purchaseId?: string | null;
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
  purchaseId?: string | null;
  paymentId?: string | null;
  amountPaise: number;
  description: string;
  referenceType?: string | null;
  referenceId?: string | null;
  transactionAt: string;
};

type ApiResponse = {
  success: boolean;
  purchase?: Purchase;
  payments?: Payment[];
  ledger?: LedgerEntry[];
  error?: string;
};

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);

const dateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function PurchaseAccountingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [purchaseId, setPurchaseId] = useState("");
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then((value) => setPurchaseId(value.id));
  }, [params]);

  async function loadData(id: string) {
    try {
      setLoading(true);
      setError("");

      const purchaseResponse = await fetch(
        `/api/admin/purchases/${id}`,
        { cache: "no-store" }
      );

      const purchaseData =
        (await purchaseResponse.json()) as ApiResponse;

      if (!purchaseResponse.ok || !purchaseData.success) {
        throw new Error(
          purchaseData.error || "Failed to load purchase."
        );
      }

      setPurchase(purchaseData.purchase || null);

      const paymentResponse = await fetch(
        `/api/admin/payments?purchaseId=${encodeURIComponent(id)}`,
        { cache: "no-store" }
      );

      if (paymentResponse.ok) {
        const paymentData =
          (await paymentResponse.json()) as ApiResponse;

        if (paymentData.success) {
          setPayments(paymentData.payments || []);
        }
      }

      if (purchaseData.purchase?.supplierId) {
        const ledgerResponse = await fetch(
          `/api/admin/suppliers/${purchaseData.purchase.supplierId}/ledger`,
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
                  entry.purchaseId === id ||
                  entry.referenceId === id
              )
            );
          }
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load purchase accounting."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (purchaseId) {
      loadData(purchaseId);
    }
  }, [purchaseId]);

  const paymentSummary = useMemo(() => {
    const paid = payments
      .filter((payment) => payment.status === "SUCCESS")
      .filter(
        (payment) =>
          payment.type === "PAY" ||
          payment.type === "PAY_REVERSAL"
      )
      .reduce((sum, payment) => {
        if (payment.type === "PAY_REVERSAL") {
          return sum - payment.amountPaise;
        }

        return sum + payment.amountPaise;
      }, 0);

    return {
      paid,
      outstanding: Math.max(
        0,
        (purchase?.totalPaise || 0) - paid
      ),
    };
  }, [payments, purchase]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-10 text-center text-slate-500 shadow-sm">
          Loading purchase accounting...
        </div>
      </main>
    );
  }

  if (!purchase) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-10 text-center">
          <p className="font-bold text-red-600">
            {error || "Purchase not found."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">

        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
              Purchase Accounting
            </p>

            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
              {purchase.purchaseNumber}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Complete purchase, payment and supplier-ledger trace.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/purchases/${purchase.id}`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Purchase Details
            </Link>

            <Link
              href={`/admin/suppliers/${purchase.supplierId}/ledger`}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Supplier Ledger
            </Link>
          </div>
        </section>

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-4">

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Purchase Total
            </p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">
              {money(purchase.totalPaise)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Successful Payment
            </p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-700">
              {money(paymentSummary.paid)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Supplier Outstanding
            </p>
            <p className="mt-2 text-2xl font-extrabold text-red-700">
              {money(paymentSummary.outstanding)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Purchase Status
            </p>
            <p className="mt-2 text-xl font-extrabold text-slate-900">
              {purchase.status}
            </p>
          </div>

        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-extrabold text-slate-900">
            Purchase Financial Summary
          </h2>

          <div className="mt-5 space-y-3 text-sm">

            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">
                Taxable / Subtotal
              </span>
              <span className="font-bold">
                {money(purchase.subtotalPaise)}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">
                GST
              </span>
              <span className="font-bold">
                {money(purchase.gstPaise)}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-slate-500">
                Delivery
              </span>
              <span className="font-bold">
                {money(purchase.deliveryPaise)}
              </span>
            </div>

            <div className="flex justify-between text-lg">
              <span className="font-extrabold">
                Total Purchase
              </span>
              <span className="font-extrabold">
                {money(purchase.totalPaise)}
              </span>
            </div>

          </div>

        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-extrabold text-slate-900">
              Payment Trace
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Every successful supplier payment and reversal remains separately traceable.
            </p>
          </div>

          {payments.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No payment records linked to this purchase.
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
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          {payment.status}
                        </span>
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
            <h2 className="text-xl font-extrabold text-slate-900">
              Supplier Ledger Trace
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Ledger entries directly associated with this purchase.
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
            Audit & Control
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                Purchase
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Purchase amount and supplier relationship remain traceable.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                Payment
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Payments and reversals are separate accounting events.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                Ledger
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Supplier ledger provides the financial control trail.
              </p>
            </div>

          </div>

        </section>

      </div>
    </main>
  );
}