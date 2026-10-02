"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type LedgerRow = {
  id: string;
  ledgerNumber: string;
  entryType: string;
  accountType: string;
  orderId?: string | null;
  paymentId?: string | null;
  amountPaise: number;
  description: string;
  referenceType?: string | null;
  referenceId?: string | null;
  transactionAt: string;
  debitPaise: number;
  creditPaise: number;
  balancePaise: number;
};

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  companyName?: string | null;
  gstin?: string | null;
};

function money(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function shortId(value?: string | null) {
  if (!value) return "—";
  return value.length > 16
    ? `${value.slice(0, 8)}…${value.slice(-6)}`
    : value;
}

export default function CustomerLedgerPage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [summary, setSummary] = useState({
    entryCount: 0,
    totalDebitPaise: 0,
    totalCreditPaise: 0,
    closingBalancePaise: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLedger() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/admin/customers/${customerId}/ledger`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Failed to load customer ledger."
          );
        }

        if (!active) return;

        setCustomer(data.customer);
        setLedger(data.ledger || []);
        setSummary(
          data.summary || {
            entryCount: 0,
            totalDebitPaise: 0,
            totalCreditPaise: 0,
            closingBalancePaise: 0,
          }
        );
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load customer ledger."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLedger();

    return () => {
      active = false;
    };
  }, [customerId]);

  const balanceLabel = useMemo(() => {
    if (summary.closingBalancePaise > 0) return "Outstanding";
    if (summary.closingBalancePaise < 0) return "Advance / Credit";
    return "Settled";
  }, [summary.closingBalancePaise]);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href={`/admin/customers/${customerId}`}
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              ← Back to Customer
            </Link>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              Customer Account Statement
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Immutable transaction ledger with running balance
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Print / Save PDF
            </button>

            <Link
              href={`/admin/customers/${customerId}`}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Customer Profile
            </Link>
          </div>
        </div>

        {loading && (
          <section className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-slate-600">
              Loading account statement…
            </p>
          </section>
        )}

        {error && (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <p className="font-bold text-red-700">
              {error}
            </p>
          </section>
        )}

        {!loading && !error && customer && (
          <>
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Customer
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-slate-900">
                    {customer.name}
                  </p>
                  {customer.companyName && (
                    <p className="text-sm text-slate-500">
                      {customer.companyName}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Contact
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {customer.phone || "—"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {customer.email || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    GSTIN
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-700">
                    {customer.gstin || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Ledger Entries
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-900">
                    {summary.entryCount}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <p className="text-sm font-bold text-slate-500">
                  Total Debit
                </p>
                <p className="mt-2 text-2xl font-extrabold text-slate-900">
                  {money(summary.totalDebitPaise)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Sales / charges
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <p className="text-sm font-bold text-slate-500">
                  Total Credit
                </p>
                <p className="mt-2 text-2xl font-extrabold text-emerald-700">
                  {money(summary.totalCreditPaise)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Receipts / refunds
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <p className="text-sm font-bold text-slate-500">
                  {balanceLabel}
                </p>

                <p
                  className={`mt-2 text-2xl font-extrabold ${
                    summary.closingBalancePaise > 0
                      ? "text-red-700"
                      : summary.closingBalancePaise < 0
                        ? "text-blue-700"
                        : "text-emerald-700"
                  }`}
                >
                  {money(Math.abs(summary.closingBalancePaise))}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Closing ledger balance
                </p>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Transaction Ledger
                  </h2>
                  <p className="text-sm text-slate-500">
                    Original accounting records remain immutable.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">
                  {ledger.length} transaction{ledger.length === 1 ? "" : "s"}
                </span>
              </div>

              {ledger.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="font-bold text-slate-700">
                    No ledger transactions found.
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Transactions will appear here after sales or payments.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1100px] w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Date</th>
                        <th className="px-5 py-4">Ledger No.</th>
                        <th className="px-5 py-4">Type</th>
                        <th className="px-5 py-4">Description</th>
                        <th className="px-5 py-4 text-right">Debit</th>
                        <th className="px-5 py-4 text-right">Credit</th>
                        <th className="px-5 py-4 text-right">Balance</th>
                        <th className="px-5 py-4">Reference</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {ledger.map((row) => (
                        <tr
                          key={row.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                            {dateTime(row.transactionAt)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-bold text-slate-700">
                            {row.ledgerNumber}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                              {row.entryType}
                            </span>
                          </td>

                          <td className="max-w-sm px-5 py-4 text-slate-700">
                            {row.description}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-slate-900">
                            {row.debitPaise
                              ? money(row.debitPaise)
                              : "—"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-emerald-700">
                            {row.creditPaise
                              ? money(row.creditPaise)
                              : "—"}
                          </td>

                          <td
                            className={`whitespace-nowrap px-5 py-4 text-right font-extrabold ${
                              row.balancePaise > 0
                                ? "text-red-700"
                                : row.balancePaise < 0
                                  ? "text-blue-700"
                                  : "text-slate-700"
                            }`}
                          >
                            {money(Math.abs(row.balancePaise))}
                            {row.balancePaise > 0 && (
                              <span className="ml-1 text-[10px]">
                                DR
                              </span>
                            )}
                            {row.balancePaise < 0 && (
                              <span className="ml-1 text-[10px]">
                                CR
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-500">
                            <div className="font-semibold">
                              {row.referenceType || "—"}
                            </div>

                            {row.referenceId && (
                              <div className="mt-1 font-mono">
                                {shortId(row.referenceId)}
                              </div>
                            )}

                            {row.orderId && (
                              <div className="mt-1">
                                Order: {shortId(row.orderId)}
                              </div>
                            )}

                            {row.paymentId && (
                              <div className="mt-1">
                                Payment: {shortId(row.paymentId)}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-5 text-right font-extrabold text-slate-700"
                        >
                          TOTAL
                        </td>

                        <td className="px-5 py-5 text-right font-extrabold text-slate-900">
                          {money(summary.totalDebitPaise)}
                        </td>

                        <td className="px-5 py-5 text-right font-extrabold text-emerald-700">
                          {money(summary.totalCreditPaise)}
                        </td>

                        <td className="px-5 py-5 text-right font-extrabold text-slate-900">
                          {money(Math.abs(summary.closingBalancePaise))}
                        </td>

                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-extrabold text-amber-900">
                Accounting Traceability
              </h3>

              <ul className="mt-2 space-y-1 text-sm text-amber-800">
                <li>• Ledger entries are read-only accounting records.</li>
                <li>• Payments are linked through Payment IDs.</li>
                <li>• Sales and corrections retain their original references.</li>
                <li>• Refunds and reversals remain traceable as separate transactions.</li>
                <li>• Viewing this statement is itself recorded in the audit trail.</li>
              </ul>
            </section>
          </>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          button,
          a {
            display: none !important;
          }

          main {
            padding: 0 !important;
          }

          section {
            box-shadow: none !important;
            break-inside: avoid;
          }

          table {
            font-size: 10px;
          }
        }
      `}</style>
    </main>
  );
}