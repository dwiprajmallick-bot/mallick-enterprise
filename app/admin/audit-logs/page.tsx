"use client";

import { useEffect, useMemo, useState } from "react";

type AuditLog = {
  id: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string | null;
  oldValues: string | null;
  newValues: string | null;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
  } | null;
};

type ApiResponse = {
  success: boolean;
  data: AuditLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  message?: string;
};

const ACTIONS = [
  "CREATE",
  "VIEW",
  "UPDATE",
  "APPROVE",
  "REJECT",
  "DELETE_REQUEST",
  "DELETE",
  "RESTORE",
  "PAYMENT_RECEIVE",
  "PAYMENT_PAY",
  "PURCHASE",
  "SALE",
  "STOCK_IN",
  "STOCK_OUT",
  "STOCK_ADJUSTMENT",
  "GST_CREATE",
  "GST_UPDATE",
  "LEDGER_CREATE",
  "LEDGER_UPDATE",
  "DOCUMENT_UPLOAD",
  "DOCUMENT_CHANGE",
  "CORRECTION",
  "REVERSAL",
  "LOGIN",
  "LOGOUT",
  "EXPORT",
];

const ENTITY_TYPES = [
  "Product",
  "Customer",
  "Order",
  "StockMovement",
  "QuoteRequest",
  "Supplier",
  "Purchase",
  "Payment",
  "Ledger",
  "Document",
  "User",
];

const ROLES = [
  "ADMIN",
  "STAFF",
  "ACCOUNTANT",
  "CUSTOMER",
  "SUPPLIER",
];

function prettyJson(value: string | null) {
  if (!value) {
    return "—";
  }

  try {
    return JSON.stringify(
      JSON.parse(value),
      null,
      2
    );
  } catch {
    return value;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "medium",
    }
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedLog, setSelectedLog] =
    useState<AuditLog | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("pageSize", "50");

    if (action) {
      params.set("action", action);
    }

    if (entityType) {
      params.set("entityType", entityType);
    }

    if (actorRole) {
      params.set("actorRole", actorRole);
    }

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (from) {
      params.set("from", from);
    }

    if (to) {
      params.set("to", to);
    }

    return params.toString();
  }, [
    page,
    action,
    entityType,
    actorRole,
    search,
    from,
    to,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadAuditLogs() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/admin/audit-logs?${queryString}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result =
          (await response.json()) as ApiResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Failed to load audit logs."
          );
        }

        if (cancelled) {
          return;
        }

        setLogs(result.data);
        setTotalPages(
          result.pagination.totalPages || 1
        );
        setTotal(result.pagination.total);
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load audit logs."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAuditLogs();

    return () => {
      cancelled = true;
    };
  }, [queryString]);

  function applyFilters() {
    setPage(1);
  }

  function clearFilters() {
    setAction("");
    setEntityType("");
    setActorRole("");
    setSearch("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Audit Trail
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Complete system activity history with
            actor, action, entity and change details.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All actions</option>

              {ACTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">
                All entities
              </option>

              {ENTITY_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={actorRole}
              onChange={(e) => {
                setActorRole(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">
                All roles
              </option>

              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              aria-label="From date"
            />

            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              aria-label="To date"
            />

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Clear Filters
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search description or reference ID..."
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            />

            <button
              type="button"
              onClick={applyFilters}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Apply Filters
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {loading
              ? "Loading..."
              : `${total} audit records`}
          </p>

          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-100">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Time
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Actor
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Action
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Entity
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Description
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Reference
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Details
                  </th>
                </tr>
              </thead>

              <tbody>
                {logs.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      No audit records found.
                    </td>
                  </tr>
                )}

                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                      {formatDate(log.createdAt)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {log.actor?.name ||
                          log.actorRole ||
                          "System"}
                      </div>

                      <div className="text-xs text-slate-500">
                        {log.actorRole || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {log.entityType}
                      </div>

                      <div className="max-w-32 truncate text-xs text-slate-500">
                        {log.entityId || "—"}
                      </div>
                    </td>

                    <td className="max-w-sm px-4 py-3 text-slate-700">
                      {log.description || "—"}
                    </td>

                    <td className="px-4 py-3">
                      {log.referenceId ? (
                        <>
                          <div className="text-xs font-medium text-slate-700">
                            {log.referenceType || "Reference"}
                          </div>

                          <div className="max-w-40 truncate text-xs text-slate-500">
                            {log.referenceId}
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedLog(log)
                        }
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              disabled={
                page <= 1 || loading
              }
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1)
                )
              }
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-xs text-slate-500">
              {total === 0
                ? "No records"
                : `${(page - 1) * 50 + 1}-${Math.min(
                    page * 50,
                    total
                  )} of ${total}`}
            </span>

            <button
              type="button"
              disabled={
                page >= totalPages ||
                loading
              }
              onClick={() =>
                setPage((current) =>
                  Math.min(
                    totalPages,
                    current + 1
                  )
                )
              }
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Audit Details
                </h2>

                <p className="text-xs text-slate-500">
                  {selectedLog.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedLog(null)
                }
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              >
                Close
              </button>
            </div>

            <div className="grid gap-5 p-5 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  Event
                </h3>

                <div className="space-y-1 text-sm text-slate-600">
                  <p>
                    Action: {selectedLog.action}
                  </p>

                  <p>
                    Entity:{" "}
                    {selectedLog.entityType}
                  </p>

                  <p>
                    Entity ID:{" "}
                    {selectedLog.entityId ||
                      "—"}
                  </p>

                  <p>
                    Date:{" "}
                    {formatDate(
                      selectedLog.createdAt
                    )}
                  </p>

                  <p>
                    Actor role:{" "}
                    {selectedLog.actorRole ||
                      "—"}
                  </p>

                  <p>
                    Actor:{" "}
                    {selectedLog.actor?.name ||
                      "System"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  Technical Metadata
                </h3>

                <div className="space-y-1 text-sm text-slate-600">
                  <p>
                    IP:{" "}
                    {selectedLog.ipAddress ||
                      "—"}
                  </p>

                  <p>
                    Session:{" "}
                    {selectedLog.sessionId ||
                      "—"}
                  </p>

                  <p>
                    Reference type:{" "}
                    {selectedLog.referenceType ||
                      "—"}
                  </p>

                  <p>
                    Reference ID:{" "}
                    {selectedLog.referenceId ||
                      "—"}
                  </p>
                </div>
              </div>

              <div className="md:col-span-2">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  Description
                </h3>

                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  {selectedLog.description ||
                    "—"}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  Old Values
                </h3>

                <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                  {prettyJson(
                    selectedLog.oldValues
                  )}
                </pre>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  New Values
                </h3>

                <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                  {prettyJson(
                    selectedLog.newValues
                  )}
                </pre>
              </div>

              <div className="md:col-span-2">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  Reason
                </h3>

                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  {selectedLog.reason ||
                    "—"}
                </div>
              </div>

              <div className="md:col-span-2">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  User Agent
                </h3>

                <div className="break-all rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                  {selectedLog.userAgent ||
                    "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
