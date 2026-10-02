"use client";

import { useEffect, useState } from "react";

type ReturnRecord = {
  id: string;
  returnNumber: string;
  status: string;
  reason: string;
  totalAmount: number;
  refundStatus: string;
  refundAmount: number;
  createdAt: string;
  creditNote?: {
    id: string;
    creditNoteNumber: string;
    status: string;
    totalAmountPaise: number;
    totalGstPaise: number;
    issuedAt: string;
  } | null;
};

type Props = {
  invoiceId: string;
};

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function paise(value: number) {
  return `₹${(Number(value || 0) / 100).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function date(value: string) {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function DocumentTrace({
  invoiceId,
}: Props) {
  const [returns, setReturns] = useState<ReturnRecord[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTrace() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/invoices/${invoiceId}/sales-returns`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to load document trace."
        );
      }

      setReturns(
        Array.isArray(data.salesReturns)
          ? data.salesReturns
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load document trace."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (invoiceId) {
      loadTrace();
    }
  }, [invoiceId]);

  const totalReturned = returns.reduce(
    (sum, item) =>
      sum + Number(item.totalAmount || 0),
    0
  );

  const totalRefunded = returns.reduce(
    (sum, item) =>
      sum + Number(item.refundAmount || 0),
    0
  );

  const activeReturns = returns.filter(
    (item) => item.status !== "CANCELLED"
  );

  const activeCreditNotes = returns.filter(
    (item) =>
      item.creditNote &&
      item.creditNote.status !== "CANCELLED"
  );

  if (loading) {
    return (
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-slate-900">
          Document Trace
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Loading Invoice transaction history...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-xl font-extrabold text-red-900">
          Document Trace
        </h2>

        <p className="mt-2 text-sm text-red-700">
          {error}
        </p>

        <button
          type="button"
          onClick={loadTrace}
          className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:mt-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Document Trace
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Complete Invoice → Return → Credit Note →
            Refund trace.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-extrabold text-slate-700">
          Audit-linked history
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Returns
          </p>

          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {activeReturns.length}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Return Value
          </p>

          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {money(totalReturned)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Credit Notes
          </p>

          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {activeCreditNotes.length}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Refund Recorded
          </p>

          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {money(totalRefunded)}
          </p>
        </div>
      </div>

      {returns.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-bold text-slate-700">
            No Sales Return is currently linked to
            this Invoice.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Once a Credit Note is linked to this
            Invoice, its Sales Return trace will
            appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {returns.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Sales Return
                  </p>

                  <a
                    href={`/admin/returns/${item.id}`}
                    className="mt-1 inline-block text-lg font-extrabold text-blue-700 hover:underline"
                  >
                    {item.returnNumber}
                  </a>

                  <p className="mt-1 text-sm text-slate-500">
                    {item.reason}
                  </p>

                  <p className="mt-2 text-xs text-slate-400">
                    Created {date(item.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    Return: {item.status}
                  </span>

                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    Refund: {item.refundStatus}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Return Amount
                  </p>

                  <p className="mt-1 font-extrabold text-slate-900">
                    {money(item.totalAmount)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Refund Amount
                  </p>

                  <p className="mt-1 font-extrabold text-slate-900">
                    {money(item.refundAmount)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Credit Note
                  </p>

                  {item.creditNote ? (
                    <div>
                      <a
                        href={`/admin/credit-notes/${item.id}`}
                        className="mt-1 inline-block font-extrabold text-blue-700 hover:underline"
                      >
                        {item.creditNote.creditNoteNumber}
                      </a>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.creditNote.status} ·{" "}
                        {paise(
                          item.creditNote.totalAmountPaise
                        )}
                      </p>
                    </div>
                  ) : (
                    <span className="mt-1 inline-block text-sm font-semibold text-slate-400">
                      Not issued
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                  <span className="rounded-lg bg-slate-100 px-3 py-2">
                    Invoice
                  </span>

                  <span className="px-1 py-2">
                    →
                  </span>

                  <span className="rounded-lg bg-slate-100 px-3 py-2">
                    Sales Return
                  </span>

                  <span className="px-1 py-2">
                    →
                  </span>

                  <span className="rounded-lg bg-slate-100 px-3 py-2">
                    {item.creditNote
                      ? "Credit Note"
                      : "Credit Note Pending"}
                  </span>

                  <span className="px-1 py-2">
                    →
                  </span>

                  <span className="rounded-lg bg-slate-100 px-3 py-2">
                    {item.refundStatus === "REFUNDED"
                      ? "Refund Recorded"
                      : "Refund Pending"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}