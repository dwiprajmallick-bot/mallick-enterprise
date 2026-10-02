"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type PaymentRecord = {
  id: string;
  source: string;
  type: string;
  status: string;
  amountPaise: number;
  reference: string;
  date: string | null;
  party: string;
  customerId: string | null;
  supplierId: string | null;
  orderId: string | null;
  purchaseId: string | null;
};

type DashboardData = {
  ok: boolean;

  summary: {
    totalRecords: number;
    totalAmountPaise: number;
    postedAmountPaise: number;
    reversedAmountPaise: number;
    customerReceivedPaise: number;
    supplierPaidPaise: number;
    refundsPaise: number;
  };

  records: PaymentRecord[];

  capabilities: {
    paymentTable: boolean;
    supplierPaymentTable: boolean;
  };
};

function money(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((paise || 0) / 100);
}

function dateText(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN");
}

function readable(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function statusClass(status: string) {
  const value = status.toUpperCase();

  if (
    value === "POSTED" ||
    value === "PAID" ||
    value === "SETTLED" ||
    value === "RECEIVED" ||
    value === "COMPLETED" ||
    value === "SUCCESS"
  ) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (
    value === "REVERSED" ||
    value === "REFUNDED" ||
    value === "CANCELLED"
  ) {
    return "bg-red-100 text-red-700";
  }

  if (
    value === "DRAFT" ||
    value === "PENDING" ||
    value === "APPROVED"
  ) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

export default function PaymentManagementDashboard() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("ALL");

  const [type, setType] =
    useState("ALL");

  const [from, setFrom] =
    useState("");

  const [to, setTo] =
    useState("");

  const loadDashboard = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const params =
          new URLSearchParams();

        if (search) {
          params.set("search", search);
        }

        if (status !== "ALL") {
          params.set("status", status);
        }

        if (type !== "ALL") {
          params.set("type", type);
        }

        if (from) {
          params.set("from", from);
        }

        if (to) {
          params.set("to", to);
        }

        const response = await fetch(
          `/api/admin/payments/dashboard?${params.toString()}`,
          {
            cache: "no-store",
          }
        );

        const json =
          await response.json();

        if (!response.ok || !json.ok) {
          throw new Error(
            json.error ||
              "Unable to load payment dashboard."
          );
        }

        setData(json);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load payment dashboard."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      search,
      status,
      type,
      from,
      to,
    ]
  );

  useEffect(() => {
    const timer = setTimeout(
      loadDashboard,
      250
    );

    return () => clearTimeout(timer);
  }, [loadDashboard]);

  const rows =
    data?.records || [];

  const statusOptions =
    useMemo(() => {
      const values =
        new Set(
          rows
            .map(
              (row) => row.status
            )
            .filter(Boolean)
        );

      return Array.from(values).sort();
    }, [rows]);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                OfficeKart
              </p>

              <h1 className="mt-2 text-3xl font-black">
                Payment Management Dashboard
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Customer receipts, supplier payments,
                refunds, reversals and payment history
                in one operational view.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">

              <a
                href="/admin/payments"
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900"
              >
                Payment Dashboard
              </a>

              <a
                href="/admin/supplier-payments"
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white"
              >
                Supplier Payments
              </a>

              <a
                href="/admin/ledger"
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white"
              >
                Ledger
              </a>

            </div>
          </div>
        </header>

        {/* PRIMARY SUMMARY */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              All Payment Value
            </p>

            <p className="mt-2 text-2xl font-black text-slate-900">
              {money(
                data?.summary
                  .totalAmountPaise || 0
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              Customer Received
            </p>

            <p className="mt-2 text-2xl font-black text-emerald-700">
              {money(
                data?.summary
                  .customerReceivedPaise || 0
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              Supplier Paid
            </p>

            <p className="mt-2 text-2xl font-black text-blue-700">
              {money(
                data?.summary
                  .supplierPaidPaise || 0
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              Refunds
            </p>

            <p className="mt-2 text-2xl font-black text-red-700">
              {money(
                data?.summary
                  .refundsPaise || 0
              )}
            </p>
          </div>

        </section>

        {/* SECONDARY SUMMARY */}

        <section className="grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              Payment Records
            </p>

            <p className="mt-1 text-2xl font-black">
              {data?.summary.totalRecords || 0}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              Posted / Settled
            </p>

            <p className="mt-1 text-2xl font-black text-emerald-700">
              {money(
                data?.summary
                  .postedAmountPaise || 0
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              Reversed / Refunded
            </p>

            <p className="mt-1 text-2xl font-black text-red-700">
              {money(
                data?.summary
                  .reversedAmountPaise || 0
              )}
            </p>
          </div>

        </section>

        {/* FILTERS */}

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

          <div className="mb-4">
            <h2 className="font-black text-slate-900">
              Payment Search & Filters
            </h2>

            <p className="text-xs text-slate-500">
              Search by payment ID, reference,
              customer, supplier, order or purchase.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search payment / reference / party / ID"
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900 lg:col-span-2"
            />

            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value)
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="ALL">
                All Types
              </option>

              <option value="CUSTOMER_RECEIVE">
                Customer Receive
              </option>

              <option value="SUPPLIER_PAY">
                Supplier Pay
              </option>

              <option value="REFUND">
                Refund
              </option>
            </select>

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="ALL">
                All Statuses
              </option>

              {statusOptions.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {readable(item)}
                  </option>
                )
              )}
            </select>

            <div className="flex gap-2">

              <input
                type="date"
                value={from}
                onChange={(event) =>
                  setFrom(event.target.value)
                }
                className="min-w-0 w-1/2 rounded-xl border border-slate-300 px-3 py-3 text-sm"
              />

              <input
                type="date"
                value={to}
                onChange={(event) =>
                  setTo(event.target.value)
                }
                className="min-w-0 w-1/2 rounded-xl border border-slate-300 px-3 py-3 text-sm"
              />

            </div>

          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* REGISTER */}

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">

          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

            <div>
              <h2 className="font-black text-slate-900">
                Unified Payment Register
              </h2>

              <p className="text-xs text-slate-500">
                Customer payment and supplier payment
                records are shown together.
              </p>
            </div>

            {loading && (
              <span className="text-xs font-bold text-slate-500">
                Loading...
              </span>
            )}

          </div>

          <div className="overflow-x-auto">

            <table className="min-w-full text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                <tr>
                  <th className="px-5 py-3">
                    Date
                  </th>

                  <th className="px-5 py-3">
                    Type
                  </th>

                  <th className="px-5 py-3">
                    Reference
                  </th>

                  <th className="px-5 py-3">
                    Party / Link
                  </th>

                  <th className="px-5 py-3">
                    Amount
                  </th>

                  <th className="px-5 py-3">
                    Status
                  </th>
                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {rows.map((row) => (
                  <tr
                    key={`${row.source}-${row.id}`}
                    className="hover:bg-slate-50"
                  >

                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {dateText(row.date)}
                    </td>

                    <td className="px-5 py-4 font-bold text-slate-800">
                      {readable(row.type)}
                    </td>

                    <td className="px-5 py-4">

                      <div className="font-semibold text-slate-900">
                        {row.reference || "-"}
                      </div>

                      <div className="text-xs text-slate-400">
                        {row.source}
                      </div>

                      <div className="text-xs text-slate-400">
                        {row.id}
                      </div>

                    </td>

                    <td className="px-5 py-4 text-slate-600">

                      <div>
                        {row.party ||
                          row.customerId ||
                          row.supplierId ||
                          "-"}
                      </div>

                      <div className="text-xs text-slate-400">
                        {row.orderId ||
                          row.purchaseId ||
                          ""}
                      </div>

                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-black text-slate-900">
                      {money(row.amountPaise)}
                    </td>

                    <td className="px-5 py-4">

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                          row.status
                        )}`}
                      >
                        {readable(row.status)}
                      </span>

                    </td>

                  </tr>
                ))}

                {!loading &&
                  rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        No payment records match
                        the selected filters.
                      </td>
                    </tr>
                  )}

              </tbody>

            </table>

          </div>
        </section>

        {/* WORKFLOW LINKS */}

        <section className="grid gap-4 md:grid-cols-3">

          <a
            href="/admin/payments"
            className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 transition hover:ring-slate-400"
          >
            <h3 className="font-black">
              Customer Receive / Refund
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Open the payment workflow for customer
              receipts and refund-related records.
            </p>
          </a>

          <a
            href="/admin/supplier-payments"
            className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 transition hover:ring-slate-400"
          >
            <h3 className="font-black">
              Supplier Payable / Payment
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Open supplier outstanding, payment
              approval, posting and reversal workflows.
            </p>
          </a>

          <a
            href="/admin/ledger"
            className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 transition hover:ring-slate-400"
          >
            <h3 className="font-black">
              Ledger & Accounting
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Review accounting entries connected
              to posted financial activity.
            </p>
          </a>

        </section>

      </div>
    </main>
  );
}