"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Quote = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  companyName: string | null;
  message: string | null;
  status: string;
  decisionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUSES = [
  "NEW",
  "CONTACTED",
  "QUOTED",
  "APPROVED",
  "REJECTED",
  "CLOSED",
];

const DECISION_STATUSES = ["APPROVED", "REJECTED"];

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [decisionQuote, setDecisionQuote] =
    useState<Quote | null>(null);

  const [decisionStatus, setDecisionStatus] =
    useState<"APPROVED" | "REJECTED" | null>(null);

  const [decisionReason, setDecisionReason] = useState("");

  async function loadQuotes() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/quotes", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load quote requests"
        );
      }

      setQuotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load quote requests"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuotes();
  }, []);

  const filteredQuotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return quotes.filter((quote) => {
      const matchesSearch =
        !query ||
        quote.name.toLowerCase().includes(query) ||
        quote.phone.toLowerCase().includes(query) ||
        (quote.email || "").toLowerCase().includes(query) ||
        (quote.companyName || "")
          .toLowerCase()
          .includes(query) ||
        (quote.message || "")
          .toLowerCase()
          .includes(query) ||
        (quote.decisionReason || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        quote.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [quotes, search, statusFilter]);

  async function updateStatus(
    id: string,
    status: string,
    reason?: string
  ) {
    try {
      setUpdatingId(id);
      setError("");

      const response = await fetch(
        `/api/admin/quotes/${id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            ...(reason ? { reason } : {}),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update status"
        );
      }

      setQuotes((current) =>
        current.map((quote) =>
          quote.id === id
            ? {
                ...quote,
                status: data.status,
                decisionReason:
                  data.decisionReason ??
                  quote.decisionReason,
                updatedAt:
                  data.updatedAt ??
                  quote.updatedAt,
              }
            : quote
        )
      );

      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update status"
      );

      return false;
    } finally {
      setUpdatingId(null);
    }
  }

  function handleStatusChange(
    quote: Quote,
    nextStatus: string
  ) {
    if (nextStatus === quote.status) {
      return;
    }

    if (DECISION_STATUSES.includes(nextStatus)) {
      setDecisionQuote(quote);
      setDecisionStatus(
        nextStatus as "APPROVED" | "REJECTED"
      );
      setDecisionReason(
        nextStatus === "APPROVED"
          ? quote.status === "APPROVED"
            ? quote.decisionReason || ""
            : ""
          : quote.status === "REJECTED"
            ? quote.decisionReason || ""
            : ""
      );
      return;
    }

    void updateStatus(quote.id, nextStatus);
  }

  async function confirmDecision() {
    if (!decisionQuote || !decisionStatus) {
      return;
    }

    const reason = decisionReason.trim();

    if (!reason) {
      setError(
        decisionStatus === "APPROVED"
          ? "Approval reason is required."
          : "Rejection reason is required."
      );
      return;
    }

    const success = await updateStatus(
      decisionQuote.id,
      decisionStatus,
      reason
    );

    if (success) {
      setDecisionQuote(null);
      setDecisionStatus(null);
      setDecisionReason("");
    }
  }

  function cancelDecision() {
    setDecisionQuote(null);
    setDecisionStatus(null);
    setDecisionReason("");
    setError("");
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function statusClass(status: string) {
    switch (status) {
      case "NEW":
        return "bg-blue-100 text-blue-700";

      case "CONTACTED":
        return "bg-amber-100 text-amber-700";

      case "QUOTED":
        return "bg-green-100 text-green-700";

      case "APPROVED":
        return "bg-emerald-100 text-emerald-700";

      case "REJECTED":
        return "bg-red-100 text-red-700";

      case "CLOSED":
        return "bg-slate-200 text-slate-700";

      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  const totalCount = quotes.length;
  const newCount = quotes.filter(
    (q) => q.status === "NEW"
  ).length;
  const contactedCount = quotes.filter(
    (q) => q.status === "CONTACTED"
  ).length;
  const quotedCount = quotes.filter(
    (q) => q.status === "QUOTED"
  ).length;
  const approvedCount = quotes.filter(
    (q) => q.status === "APPROVED"
  ).length;
  const rejectedCount = quotes.filter(
    (q) => q.status === "REJECTED"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-600">
              OFFICEKART ADMIN
            </p>

            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
              Quote Requests
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage office quotation enquiries with decision
              tracking and audit-safe status changes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            

            <Link
              href="/admin/audit-logs"
              className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm"
            >
              Audit Logs
            </Link>

            <Link
              href="/admin"
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
            >
              Dashboard
            </Link>

            <button
              type="button"
              onClick={() => void loadQuotes()}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-xs font-extrabold text-red-600 hover:underline"
            >
              CLOSE
            </button>
          </div>
        )}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Total
            </p>

            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {totalCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              New
            </p>

            <p className="mt-2 text-3xl font-extrabold text-blue-600">
              {newCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Contacted
            </p>

            <p className="mt-2 text-3xl font-extrabold text-amber-600">
              {contactedCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Quoted
            </p>

            <p className="mt-2 text-3xl font-extrabold text-green-600">
              {quotedCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Approved
            </p>

            <p className="mt-2 text-3xl font-extrabold text-emerald-600">
              {approvedCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Rejected
            </p>

            <p className="mt-2 text-3xl font-extrabold text-red-600">
              {rejectedCount}
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, company, email, reason..."
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 md:col-span-2"
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>

              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center font-bold text-slate-500">
              Loading quote requests...
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-extrabold text-slate-700">
                No quote requests found
              </p>

              <p className="mt-2 text-sm text-slate-500">
                New quotation enquiries will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-sm text-slate-500">
                    <th className="px-5 py-4 font-extrabold">
                      Customer
                    </th>

                    <th className="px-5 py-4 font-extrabold">
                      Company
                    </th>

                    <th className="px-5 py-4 font-extrabold">
                      Contact
                    </th>

                    <th className="px-5 py-4 font-extrabold">
                      Requirement
                    </th>

                    <th className="px-5 py-4 font-extrabold">
                      Date
                    </th>

                    <th className="px-5 py-4 font-extrabold">
                      Status
                    </th>

                    <th className="px-5 py-4 font-extrabold">
                      Decision Reason
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredQuotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="border-b border-slate-100 align-top hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-extrabold text-slate-900">
                          {quote.name}
                        </p>

                        {quote.email && (
                          <p className="mt-1 text-xs text-slate-500">
                            {quote.email}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-700">
                        {quote.companyName || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <a
                          href={`tel:${quote.phone}`}
                          className="font-bold text-blue-600 hover:underline"
                        >
                          {quote.phone}
                        </a>
                      </td>

                      <td className="max-w-sm px-5 py-4 text-sm text-slate-600">
                        {quote.message || "No requirement details"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                        {formatDate(quote.createdAt)}
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={quote.status}
                          disabled={
                            updatingId === quote.id
                          }
                          onChange={(e) =>
                            handleStatusChange(
                              quote,
                              e.target.value
                            )
                          }
                          className={`rounded-full border-0 px-3 py-2 text-xs font-extrabold outline-none ${statusClass(
                            quote.status
                          )} disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {STATUSES.map((status) => (
                            <option
                              key={status}
                              value={status}
                            >
                              {status}
                            </option>
                          ))}
                        </select>

                        {updatingId === quote.id && (
                          <p className="mt-2 text-xs font-bold text-slate-400">
                            Saving...
                          </p>
                        )}
                      </td>

                      <td className="max-w-xs px-5 py-4 text-sm">
                        {quote.decisionReason ? (
                          <div className="rounded-xl bg-slate-50 p-3 text-slate-600">
                            {quote.decisionReason}
                          </div>
                        ) : (
                          <span className="text-slate-400">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {decisionQuote && decisionStatus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
              <div className="border-b border-slate-200 px-6 py-5">
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                  Quote Decision
                </p>

                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                  {decisionStatus === "APPROVED"
                    ? "Approve Quote Request"
                    : "Reject Quote Request"}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {decisionQuote.name}
                  {decisionQuote.companyName
                    ? ` • ${decisionQuote.companyName}`
                    : ""}
                </p>
              </div>

              <div className="px-6 py-5">
                <label className="block text-sm font-extrabold text-slate-700">
                  {decisionStatus === "APPROVED"
                    ? "Approval Reason"
                    : "Rejection Reason"}
                </label>

                <textarea
                  value={decisionReason}
                  onChange={(e) =>
                    setDecisionReason(e.target.value)
                  }
                  rows={5}
                  autoFocus
                  placeholder={
                    decisionStatus === "APPROVED"
                      ? "Enter why this quote request is approved..."
                      : "Enter why this quote request is rejected..."
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

                <p className="mt-2 text-xs text-slate-400">
                  This reason will be stored with the quote decision
                  and recorded in the immutable audit trail.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cancelDecision}
                  disabled={updatingId === decisionQuote.id}
                  className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-extrabold text-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void confirmDecision()}
                  disabled={
                    updatingId === decisionQuote.id ||
                    !decisionReason.trim()
                  }
                  className={`rounded-xl px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                    decisionStatus === "APPROVED"
                      ? "bg-emerald-600"
                      : "bg-red-600"
                  }`}
                >
                  {updatingId === decisionQuote.id
                    ? "Saving..."
                    : decisionStatus === "APPROVED"
                      ? "Approve Quote"
                      : "Reject Quote"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}