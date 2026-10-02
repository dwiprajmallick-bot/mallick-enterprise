"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Payment = {
  id: string;
  paymentNumber: string;
  type: string;
  status: string;
  orderId?: string | null;
  purchaseId?: string | null;
  amountPaise: number;
  method: string;
  reference?: string | null;
  notes?: string | null;
  paidAt: string;
  createdAt?: string;
};

type ApiResponse = {
  success: boolean;
  payments?: Payment[];
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

function isMoneyIn(type: string) {
  return type === "RECEIVE" || type === "REFUND_REVERSAL";
}

function isMoneyOut(type: string) {
  return type === "PAY" || type === "REFUND";
}

function isReversal(type: string) {
  return (
    type === "RECEIVE_REVERSAL" ||
    type === "PAY_REVERSAL" ||
    type === "REFUND_REVERSAL"
  );
}

export default function CashBankReconciliationPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [method, setMethod] = useState("ALL");
  const [status, setStatus] = useState("SUCCESS");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/payments",
        {
          cache: "no-store",
        }
      );

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to load payment register."
        );
      }

      setPayments(
        Array.isArray(data.payments)
          ? data.payments
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load cash and bank records."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const methods = useMemo(
    () =>
      Array.from(
        new Set(
          payments
            .map((payment) => payment.method)
            .filter(Boolean)
        )
      ).sort(),
    [payments]
  );

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments
      .filter((payment) => {
        const searchable = [
          payment.paymentNumber,
          payment.type,
          payment.method,
          payment.reference || "",
          payment.notes || "",
          payment.orderId || "",
          payment.purchaseId || "",
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !query || searchable.includes(query);

        const matchesType =
          type === "ALL" ||
          payment.type === type;

        const matchesMethod =
          method === "ALL" ||
          payment.method === method;

        const matchesStatus =
          status === "ALL" ||
          payment.status === status;

        return (
          matchesSearch &&
          matchesType &&
          matchesMethod &&
          matchesStatus
        );
      })
      .sort(
        (a, b) =>
          new Date(b.paidAt).getTime() -
          new Date(a.paidAt).getTime()
      );
  }, [payments, search, type, method, status]);

  const summary = useMemo(() => {
    const successful = payments.filter(
      (payment) =>
        payment.status === "SUCCESS"
    );

    let customerReceipts = 0;
    let supplierPayments = 0;
    let refunds = 0;
    let receiptReversals = 0;
    let paymentReversals = 0;
    let refundReversals = 0;

    for (const payment of successful) {
      switch (payment.type) {
        case "RECEIVE":
          customerReceipts += payment.amountPaise;
          break;

        case "PAY":
          supplierPayments += payment.amountPaise;
          break;

        case "REFUND":
          refunds += payment.amountPaise;
          break;

        case "RECEIVE_REVERSAL":
          receiptReversals += payment.amountPaise;
          break;

        case "PAY_REVERSAL":
          paymentReversals += payment.amountPaise;
          break;

        case "REFUND_REVERSAL":
          refundReversals += payment.amountPaise;
          break;

        default:
          break;
      }
    }

    const grossIn =
      customerReceipts +
      refundReversals;

    const grossOut =
      supplierPayments +
      refunds +
      receiptReversals -
      paymentReversals;

    const netMovement =
      grossIn - grossOut;

    return {
      customerReceipts,
      supplierPayments,
      refunds,
      receiptReversals,
      paymentReversals,
      refundReversals,
      grossIn,
      grossOut,
      netMovement,
    };
  }, [payments]);

  const methodSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        moneyIn: number;
        moneyOut: number;
        net: number;
      }
    >();

    for (const payment of payments) {
      if (payment.status !== "SUCCESS") {
        continue;
      }

      const current = map.get(payment.method) || {
        moneyIn: 0,
        moneyOut: 0,
        net: 0,
      };

      let signedAmount = 0;

      if (isMoneyIn(payment.type)) {
        current.moneyIn += payment.amountPaise;
        signedAmount += payment.amountPaise;
      }

      if (isMoneyOut(payment.type)) {
        current.moneyOut += payment.amountPaise;
        signedAmount -= payment.amountPaise;
      }

      if (payment.type === "RECEIVE_REVERSAL") {
        current.moneyOut += payment.amountPaise;
        signedAmount -= payment.amountPaise;
      }

      if (payment.type === "PAY_REVERSAL") {
        current.moneyIn += payment.amountPaise;
        signedAmount += payment.amountPaise;
      }

      current.net += signedAmount;

      map.set(payment.method, current);
    }

    return Array.from(map.entries()).sort(
      ([a], [b]) => a.localeCompare(b)
    );
  }, [payments]);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
              Accounting Control
            </p>

            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
              Cash & Bank Reconciliation
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Payment register and cash movement control.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/payments"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Payment Register
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
            This screen reconciles OfficeKart payment records.
            It is an internal transaction-control view and does not
            represent an external bank statement or bank-confirmed balance.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Customer Receipts
            </p>

            <p className="mt-2 text-2xl font-extrabold text-emerald-700">
              {money(summary.customerReceipts)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Supplier Payments
            </p>

            <p className="mt-2 text-2xl font-extrabold text-red-700">
              {money(summary.supplierPayments)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Refunds
            </p>

            <p className="mt-2 text-2xl font-extrabold text-orange-700">
              {money(summary.refunds)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Net Movement
            </p>

            <p className="mt-2 text-2xl font-extrabold text-slate-900">
              {money(summary.netMovement)}
            </p>
          </div>

        </section>

        <section className="grid gap-4 md:grid-cols-4">

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Receipt Reversals
            </p>

            <p className="mt-2 text-xl font-extrabold">
              {money(summary.receiptReversals)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Supplier Payment Reversals
            </p>

            <p className="mt-2 text-xl font-extrabold">
              {money(summary.paymentReversals)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Refund Reversals
            </p>

            <p className="mt-2 text-xl font-extrabold">
              {money(summary.refundReversals)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Records
            </p>

            <p className="mt-2 text-xl font-extrabold">
              {payments.length}
            </p>
          </div>

        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-extrabold">
            Payment Method Reconciliation
          </h2>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">
                    Method
                  </th>

                  <th className="px-6 py-4">
                    Money In
                  </th>

                  <th className="px-6 py-4">
                    Money Out
                  </th>

                  <th className="px-6 py-4">
                    Net
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {methodSummary.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      No successful payment records.
                    </td>
                  </tr>
                ) : (
                  methodSummary.map(
                    ([methodName, values]) => (
                      <tr key={methodName}>

                        <td className="px-6 py-4 font-bold">
                          {methodName}
                        </td>

                        <td className="px-6 py-4 font-semibold text-emerald-700">
                          {money(values.moneyIn)}
                        </td>

                        <td className="px-6 py-4 font-semibold text-red-700">
                          {money(values.moneyOut)}
                        </td>

                        <td className="px-6 py-4 font-extrabold">
                          {money(values.net)}
                        </td>

                      </tr>
                    )
                  )
                )}

              </tbody>

            </table>
          </div>

        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-4 md:flex-row">

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search payment number, reference, order..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value)
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="ALL">All Types</option>
              <option value="RECEIVE">RECEIVE</option>
              <option value="PAY">PAY</option>
              <option value="REFUND">REFUND</option>
              <option value="RECEIVE_REVERSAL">
                RECEIVE_REVERSAL
              </option>
              <option value="PAY_REVERSAL">
                PAY_REVERSAL
              </option>
              <option value="REFUND_REVERSAL">
                REFUND_REVERSAL
              </option>
            </select>

            <select
              value={method}
              onChange={(event) =>
                setMethod(event.target.value)
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="ALL">All Methods</option>

              {methods.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="ALL">All Status</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
            </select>

          </div>

        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">

            <div className="flex items-center justify-between gap-4">

              <div>
                <h2 className="text-xl font-extrabold">
                  Cash / Bank Movement Register
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredPayments.length} record(s) displayed
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
              Loading payment records...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No payment records match the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-full text-left text-sm">

                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">
                      Payment
                    </th>

                    <th className="px-6 py-4">
                      Type
                    </th>

                    <th className="px-6 py-4">
                      Direction
                    </th>

                    <th className="px-6 py-4">
                      Amount
                    </th>

                    <th className="px-6 py-4">
                      Method
                    </th>

                    <th className="px-6 py-4">
                      Reference
                    </th>

                    <th className="px-6 py-4">
                      Linked Record
                    </th>

                    <th className="px-6 py-4">
                      Status
                    </th>

                    <th className="px-6 py-4">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {filteredPayments.map(
                    (payment) => {

                      const moneyIn =
                        isMoneyIn(payment.type) ||
                        payment.type ===
                          "PAY_REVERSAL";

                      const moneyOut =
                        isMoneyOut(payment.type) ||
                        payment.type ===
                          "RECEIVE_REVERSAL";

                      const direction =
                        moneyIn && moneyOut
                          ? "ADJUSTMENT"
                          : moneyIn
                            ? "IN"
                            : moneyOut
                              ? "OUT"
                              : "OTHER";

                      return (
                        <tr key={payment.id}>

                          <td className="px-6 py-4 font-bold">
                            {payment.paymentNumber}
                          </td>

                          <td className="px-6 py-4">
                            {payment.type}
                          </td>

                          <td className="px-6 py-4">

                            <span
                              className={
                                direction === "IN"
                                  ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                                  : direction === "OUT"
                                    ? "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                                    : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                              }
                            >
                              {direction}
                            </span>

                          </td>

                          <td className="px-6 py-4 font-extrabold">
                            {money(payment.amountPaise)}
                          </td>

                          <td className="px-6 py-4">
                            {payment.method}
                          </td>

                          <td className="px-6 py-4">
                            {payment.reference || "—"}
                          </td>

                          <td className="px-6 py-4">

                            {payment.orderId ? (
                              <Link
                                href={`/admin/orders/${payment.orderId}`}
                                className="font-bold text-blue-600 hover:underline"
                              >
                                Order
                              </Link>
                            ) : payment.purchaseId ? (
                              <Link
                                href={`/admin/purchases/${payment.purchaseId}`}
                                className="font-bold text-blue-600 hover:underline"
                              >
                                Purchase
                              </Link>
                            ) : (
                              "—"
                            )}

                          </td>

                          <td className="px-6 py-4">
                            {payment.status}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                            {dateTime(payment.paidAt)}
                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">

          <h2 className="text-lg font-extrabold">
            Cash & Bank Control
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-4">

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                Source
              </p>

              <p className="mt-2 text-sm text-slate-600">
                All figures originate from OfficeKart payment records.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                Reversal
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Reversals remain separate records and are not destructive edits.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                Reference
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Order or purchase references provide transaction traceability.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">
                External Reconciliation
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Bank statement matching remains a separate control step.
              </p>
            </div>

          </div>

        </section>

      </div>
    </main>
  );
}