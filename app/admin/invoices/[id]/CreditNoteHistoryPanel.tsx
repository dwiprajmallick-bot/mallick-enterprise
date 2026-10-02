"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CreditNote = {
  id: string;
  creditNoteNumber: string;
  salesReturnId: string;
  orderId: string;
  customerId: string;
  invoiceId: string | null;
  status: string;
  taxableAmountPaise: number;
  totalGstPaise: number;
  totalAmountPaise: number;
  reason: string;
  notes: string | null;
  issuedAt: string;
  salesReturn: {
    id: string;
    returnNumber: string;
    status: string;
    reason: string;
    totalAmount: number;
    refundStatus: string;
    refundAmount: number;
    createdAt: string;
  } | null;
};

type Props = {
  invoiceId: string;
};

function formatMoneyPaise(value: number) {
  return `₹${(value / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CreditNoteHistoryPanel({ invoiceId }: Props) {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCreditNotes() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/invoices/${invoiceId}/credit-notes`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to load Credit Note history."
        );
      }

      setCreditNotes(data.creditNotes || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Credit Note history."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (invoiceId) {
      loadCreditNotes();
    }
  }, [invoiceId]);

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Invoice Adjustment
          </p>

          <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
            Credit Note History
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Credit Notes issued against this invoice are recorded here.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
          <span className="font-semibold text-slate-600">
            Total Credit Notes:
          </span>{" "}
          <span className="font-extrabold text-slate-900">
            {creditNotes.length}
          </span>
        </div>
      </div>

      {loading && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Loading Credit Note history...
        </div>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={loadCreditNotes}
            className="ml-3 rounded-xl bg-white px-3 py-2 font-bold text-red-700 shadow-sm"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && creditNotes.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <p className="font-bold text-slate-700">
            No Credit Note issued
          </p>

          <p className="mt-1 text-sm text-slate-500">
            This invoice currently has no linked Credit Note.
          </p>
        </div>
      )}

      {!loading && !error && creditNotes.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Credit Note</th>
                <th className="px-4 py-3">Sales Return</th>
                <th className="px-4 py-3">Taxable</th>
                <th className="px-4 py-3">GST</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {creditNotes.map((creditNote) => (
                <tr
                  key={creditNote.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-4">
                    <p className="font-extrabold text-slate-900">
                      {creditNote.creditNoteNumber}
                    </p>

                    <p className="mt-1 max-w-xs text-xs text-slate-500">
                      {creditNote.reason}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    {creditNote.salesReturn ? (
                      <Link
                        href={`/admin/returns/${creditNote.salesReturn.id}`}
                        className="font-bold text-blue-700 hover:underline"
                      >
                        {creditNote.salesReturn.returnNumber}
                      </Link>
                    ) : (
                      <span className="text-slate-400">Unavailable</span>
                    )}
                  </td>

                  <td className="px-4 py-4 font-semibold text-slate-700">
                    {formatMoneyPaise(
                      creditNote.taxableAmountPaise
                    )}
                  </td>

                  <td className="px-4 py-4 font-semibold text-slate-700">
                    {formatMoneyPaise(creditNote.totalGstPaise)}
                  </td>

                  <td className="px-4 py-4 font-extrabold text-slate-900">
                    {formatMoneyPaise(
                      creditNote.totalAmountPaise
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${
                        creditNote.status === "CANCELLED"
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {creditNote.status}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                    {formatDate(creditNote.issuedAt)}
                  </td>

                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/credit-notes/${creditNote.salesReturnId}`}
                      className="inline-flex rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Taxable Credit
              </p>
              <p className="mt-2 text-xl font-extrabold text-slate-900">
                {formatMoneyPaise(
                  creditNotes.reduce(
                    (sum, item) =>
                      sum + Number(item.taxableAmountPaise || 0),
                    0
                  )
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                GST Credit
              </p>
              <p className="mt-2 text-xl font-extrabold text-slate-900">
                {formatMoneyPaise(
                  creditNotes.reduce(
                    (sum, item) =>
                      sum + Number(item.totalGstPaise || 0),
                    0
                  )
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Credit
              </p>
              <p className="mt-2 text-xl font-extrabold text-slate-900">
                {formatMoneyPaise(
                  creditNotes.reduce(
                    (sum, item) =>
                      sum + Number(item.totalAmountPaise || 0),
                    0
                  )
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}