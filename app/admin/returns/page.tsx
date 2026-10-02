"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ReturnRecord = {
  id: string;
  returnNumber: string;
  orderId: string;
  customerId: string;
  status?: string | null;
  reason?: string | null;
  subtotal?: number;
  gstAmount?: number;
  totalAmount?: number;
  refundStatus?: string | null;
  refundAmount?: number;
  createdAt?: string;
  order?: {
    orderNumber?: string;
  } | null;
  customer?: {
    name?: string;
    companyName?: string | null;
  } | null;
};

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(status?: string | null) {
  const value = String(status || "").toUpperCase();

  if (
    value === "APPROVED" ||
    value === "COMPLETED" ||
    value === "REFUNDED"
  ) {
    return "bg-green-100 text-green-700";
  }

  if (
    value === "CANCELLED" ||
    value === "REJECTED"
  ) {
    return "bg-red-100 text-red-700";
  }

  return "bg-amber-100 text-amber-700";
}

export default function AdminReturnsPage() {
  const router = useRouter();

  const [returns, setReturns] =
    useState<ReturnRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  async function loadReturns() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/returns",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load returns."
        );
      }

      const list =
        data?.returns ||
        data?.data ||
        [];

      setReturns(
        Array.isArray(list) ? list : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load returns."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReturns();
  }, []);

  const filteredReturns = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return returns.filter((item) => {
      const matchesSearch =
        !query ||
        String(item.returnNumber || "")
          .toLowerCase()
          .includes(query) ||
        String(
          item.order?.orderNumber || ""
        )
          .toLowerCase()
          .includes(query) ||
        String(
          item.customer?.companyName ||
            item.customer?.name ||
            ""
        )
          .toLowerCase()
          .includes(query) ||
        String(item.reason || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        status === "ALL" ||
        String(item.status || "")
          .toUpperCase() === status;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [returns, search, status]);

  const totalReturns = returns.reduce(
    (sum, item) =>
      sum + Number(item.totalAmount || 0),
    0
  );

  const totalRefundPending = returns
    .filter(
      (item) =>
        String(
          item.refundStatus || ""
        ).toUpperCase() === "PENDING"
    )
    .reduce(
      (sum, item) =>
        sum + Number(item.totalAmount || 0),
      0
    );

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <button
              onClick={() =>
                router.push("/admin")
              }
              className="mb-3 text-sm font-bold text-blue-600 hover:underline"
            >
              ← Back to Admin
            </button>

            <h1 className="text-3xl font-black text-slate-900">
              Sales Returns
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Customer returns, stock adjustments
              and refund records.
            </p>
          </div>

        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* SUMMARY */}
        <section className="mb-6 grid gap-5 md:grid-cols-3">

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Returns
            </p>

            <p className="mt-2 text-3xl font-black text-slate-900">
              {returns.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Return Value
            </p>

            <p className="mt-2 text-3xl font-black text-blue-700">
              {money(totalReturns)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Refund Pending
            </p>

            <p className="mt-2 text-3xl font-black text-red-700">
              {money(totalRefundPending)}
            </p>
          </div>

        </section>

        {/* FILTERS */}
        <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm">

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search return, order, customer or reason..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
            >
              <option value="ALL">
                All Status
              </option>
              <option value="REQUESTED">
                Requested
              </option>
              <option value="APPROVED">
                Approved
              </option>
              <option value="COMPLETED">
                Completed
              </option>
              <option value="CANCELLED">
                Cancelled
              </option>
            </select>

          </div>

        </section>

        {/* TABLE */}
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Loading returns...
            </div>
          ) : filteredReturns.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No sales returns found.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>
                  <tr className="bg-slate-900 text-left text-xs uppercase tracking-wider text-white">
                    <th className="px-5 py-4">
                      Return
                    </th>

                    <th className="px-5 py-4">
                      Order
                    </th>

                    <th className="px-5 py-4">
                      Customer
                    </th>

                    <th className="px-5 py-4">
                      Date
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Refund
                    </th>

                    <th className="px-5 py-4 text-right">
                      Total
                    </th>

                    <th className="px-5 py-4 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {filteredReturns.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100"
                      >

                        <td className="px-5 py-4">
                          <button
                            onClick={() =>
                              router.push(
                                `/admin/returns/${item.id}`
                              )
                            }
                            className="font-black text-blue-600 hover:underline"
                          >
                            {item.returnNumber}
                          </button>
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {item.order
                            ?.orderNumber || "-"}
                        </td>

                        <td className="px-5 py-4">
                          {item.customer
                            ?.companyName ||
                            item.customer
                              ?.name ||
                            "-"}
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {dateTime(
                            item.createdAt
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                              item.status
                            )}`}
                          >
                            {item.status ||
                              "REQUESTED"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                              item.refundStatus
                            )}`}
                          >
                            {item.refundStatus ||
                              "PENDING"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right font-black">
                          {money(
                            Number(
                              item.totalAmount || 0
                            )
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() =>
                              router.push(
                                `/admin/returns/${item.id}`
                              )
                            }
                            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </button>
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>
    </main>
  );
}