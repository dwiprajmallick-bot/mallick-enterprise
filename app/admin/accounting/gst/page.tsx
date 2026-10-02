"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
  notes?: string | null;
  createdAt: string;
};

type ApiResponse = {
  success: boolean;
  records?: GstRecord[];
  gstRecords?: GstRecord[];
  count?: number;
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

function isPurchase(record: GstRecord) {
  const source = record.sourceType.toUpperCase();
  const entry = record.entryType.toUpperCase();

  return (
    source.includes("PURCHASE") ||
    entry.includes("PURCHASE") ||
    entry.includes("INPUT")
  );
}

function isCreditNote(record: GstRecord) {
  const source = record.sourceType.toUpperCase();
  const entry = record.entryType.toUpperCase();

  return (
    source.includes("CREDITNOTE") ||
    source.includes("CREDIT_NOTE") ||
    entry.includes("CREDIT_NOTE")
  );
}

function isCreditNoteReversal(record: GstRecord) {
  const source = record.sourceType.toUpperCase();
  const entry = record.entryType.toUpperCase();

  return (
    source.includes("CREDITNOTECANCELLATION") ||
    source.includes("CREDIT_NOTE_CANCELLATION") ||
    entry.includes("CANCELLATION") ||
    entry.includes("REVERSAL")
  );
}

export default function GstControlPage() {
  const [records, setRecords] = useState<GstRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sourceType, setSourceType] = useState("ALL");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/accounting/gst",
        {
          cache: "no-store",
        }
      );

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to load GST records."
        );
      }

      const rows = Array.isArray(data.records)
        ? data.records
        : Array.isArray(data.gstRecords)
          ? data.gstRecords
          : [];

      setRecords(rows);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load GST reconciliation."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !query ||
        record.gstNumber.toLowerCase().includes(query) ||
        record.entryType.toLowerCase().includes(query) ||
        record.sourceType.toLowerCase().includes(query) ||
        record.sourceId.toLowerCase().includes(query);

      const matchesStatus =
        status === "ALL" ||
        record.status.toUpperCase() === status;

      const matchesSource =
        sourceType === "ALL" ||
        record.sourceType.toUpperCase() === sourceType;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSource
      );
    });
  }, [records, search, status, sourceType]);

  const summary = useMemo(() => {
    let purchaseTaxable = 0;
    let purchaseGst = 0;

    let salesTaxable = 0;
    let salesGst = 0;

    let creditNoteTaxable = 0;
    let creditNoteGst = 0;

    let reversalTaxable = 0;
    let reversalGst = 0;

    for (const record of records) {
      const taxable = record.taxablePaise;
      const gst = record.gstPaise;

      if (isCreditNoteReversal(record)) {
        reversalTaxable += taxable;
        reversalGst += gst;
        continue;
      }

      if (isCreditNote(record)) {
        creditNoteTaxable += taxable;
        creditNoteGst += gst;
        continue;
      }

      if (isPurchase(record)) {
        purchaseTaxable += taxable;
        purchaseGst += gst;
        continue;
      }

      salesTaxable += taxable;
      salesGst += gst;
    }

    const activeRecords = records.filter(
      (record) =>
        record.status.toUpperCase() === "ACTIVE"
    );

    const activeGst = activeRecords.reduce(
      (sum, record) =>
        sum + record.gstPaise,
      0
    );

    const netOutputGst =
      salesGst -
      creditNoteGst +
      reversalGst;

    const inputGst = purchaseGst;

    const estimatedNetGst =
      netOutputGst - inputGst;

    return {
      purchaseTaxable,
      purchaseGst,
      salesTaxable,
      salesGst,
      creditNoteTaxable,
      creditNoteGst,
      reversalTaxable,
      reversalGst,
      activeGst,
      netOutputGst,
      inputGst,
      estimatedNetGst,
    };
  }, [records]);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
              GST Control
            </p>

            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
              GST Reconciliation
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Purchase input, sales output, credit notes and reversals.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/accounting/receivable-payable"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Receivable / Payable
            </Link>

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Print / Save PDF
            </button>
          </div>
        </section>

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </section>
        )}

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-900">
            Reconciliation Notice
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            This dashboard reconciles GST records already stored in OfficeKart.
            It does not independently determine the legally applicable GST treatment,
            place of supply, tax classification, or return filing position.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Purchase Input GST
            </p>

            <p className="mt-2 text-2xl font-extrabold text-emerald-700">
              {money(summary.inputGst)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Sales Output GST
            </p>

            <p className="mt-2 text-2xl font-extrabold text-blue-700">
              {money(summary.salesGst)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Credit Note GST
            </p>

            <p className="mt-2 text-2xl font-extrabold text-purple-700">
              {money(summary.creditNoteGst)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Net GST Difference
            </p>

            <p className="mt-2 text-2xl font-extrabold text-slate-900">
              {money(summary.estimatedNetGst)}
            </p>
          </div>

        </section>

        <section className="grid gap-4 md:grid-cols-4">

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Purchase Taxable
            </p>
            <p className="mt-2 text-xl font-extrabold">
              {money(summary.purchaseTaxable)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Sales Taxable
            </p>
            <p className="mt-2 text-xl font-extrabold">
              {money(summary.salesTaxable)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Credit Note Taxable
            </p>
            <p className="mt-2 text-xl font-extrabold">
              {money(summary.creditNoteTaxable)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Reversal GST
            </p>
            <p className="mt-2 text-xl font-extrabold">
              {money(summary.reversalGst)}
            </p>
          </div>

        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-4 md:flex-row">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search GST number, source or reference..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            <select
              value={sourceType}
              onChange={(event) =>
                setSourceType(event.target.value)
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="ALL">All Sources</option>

              {Array.from(
                new Set(
                  records.map(
                    (record) => record.sourceType
                  )
                )
              )
                .sort()
                .map((source) => (
                  <option
                    key={source}
                    value={source.toUpperCase()}
                  >
                    {source}
                  </option>
                ))}
            </select>
          </div>

        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold">
                  GST Register
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredRecords.length} record(s) displayed
                </p>
              </div>

              <button
                type="button"
                onClick={loadData}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">
              Loading GST records...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No GST records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">

                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">GST Number</th>
                    <th className="px-6 py-4">Entry</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">Rate</th>
                    <th className="px-6 py-4">Taxable</th>
                    <th className="px-6 py-4">GST</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {filteredRecords.map((record) => (
                    <tr key={record.id}>

                      <td className="px-6 py-4 font-bold">
                        {record.gstNumber}
                      </td>

                      <td className="px-6 py-4">
                        {record.entryType}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold">
                          {record.sourceType}
                        </div>

                        <div className="mt-1 max-w-xs truncate text-xs text-slate-400">
                          {record.sourceId}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {record.gstRate}%
                      </td>

                      <td className="px-6 py-4 font-semibold">
                        {money(record.taxablePaise)}
                      </td>

                      <td className="px-6 py-4 font-bold">
                        {money(record.gstPaise)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={
                            record.status.toUpperCase() ===
                            "ACTIVE"
                              ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                              : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
                          }
                        >
                          {record.status}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                        {dateTime(record.createdAt)}
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
            GST Reconciliation Logic
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-4">

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-extrabold">
                Input GST
              </p>

              <p className="mt-2 text-sm text-slate-600">
                GST records classified from purchase/input entries.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-extrabold">
                Output GST
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Non-purchase, non-credit-note GST records are treated as sales/output candidates.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-extrabold">
                Credit Note
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Credit note GST is separately identified so its financial effect can be reconciled.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-extrabold">
                Reversal
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Cancellation/reversal records remain separate from the original GST record.
              </p>
            </div>

          </div>

        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">

          <h2 className="text-lg font-extrabold">
            Audit Control
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                Source Trace
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Every GST record retains source type and source ID.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                No Silent Edit
              </p>

              <p className="mt-2 text-sm text-slate-600">
                GST correction should be represented through a separate reversal/correction event.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                Reconciliation
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Stored GST records can be compared against accounting and tax reports.
              </p>
            </div>

          </div>

        </section>

      </div>
    </main>
  );
}