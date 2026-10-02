"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DashboardData = {
  sales: {
    count: number;
    totalPaise: number;
  };
  purchases: {
    count: number;
    totalPaise: number;
  };
  margin: {
    grossMarginPaise: number;
    grossMarginPercent: number;
  };
  receivable: {
    totalPaise: number;
    accounts: number;
  };
  payable: {
    totalPaise: number;
    accounts: number;
  };
  stock: {
    quantity: number;
    valuePaise: number;
    products: number;
  };
  cash: {
    moneyInPaise: number;
    moneyOutPaise: number;
    netMovementPaise: number;
  };
  gst: {
    inputGstPaise: number;
    outputGstPaise: number;
    creditNoteGstPaise: number;
    netGstPaise: number;
  };
};

type ApiResult = {
  success: boolean;
  [key: string]: unknown;
};

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);

const number = (value: number) =>
  new Intl.NumberFormat("en-IN").format(value);

async function fetchJson(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
  });

  const data = (await response.json()) as ApiResult;

  if (!response.ok || !data.success) {
    throw new Error(
      String(data.error || `Failed to load ${url}`)
    );
  }

  return data;
}

export default function ManagementAccountingPage() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [
        receivableData,
        paymentData,
        gstData,
      ] = await Promise.all([
        fetchJson(
          "/api/admin/accounting/receivable-payable"
        ),
        fetchJson(
          "/api/admin/payments"
        ),
        fetchJson(
          "/api/admin/accounting/gst"
        ),
      ]);

      const receivableSummary =
        (receivableData.summary || {}) as Record<
          string,
          unknown
        >;

      const paymentRows =
        Array.isArray(paymentData.payments)
          ? paymentData.payments
          : [];

      const gstSummary =
        (gstData.summary || {}) as Record<
          string,
          unknown
        >;

      let moneyIn = 0;
      let moneyOut = 0;

      let salesTotal = 0;
      let purchaseTotal = 0;

      for (const item of paymentRows) {
        const payment =
          item as Record<string, unknown>;

        const status =
          String(payment.status || "");

        if (status !== "SUCCESS") {
          continue;
        }

        const amount =
          Number(payment.amountPaise || 0);

        const type =
          String(payment.type || "");

        if (
          type === "RECEIVE" ||
          type === "PAY_REVERSAL" ||
          type === "REFUND_REVERSAL"
        ) {
          moneyIn += amount;
        }

        if (
          type === "PAY" ||
          type === "REFUND" ||
          type === "RECEIVE_REVERSAL"
        ) {
          moneyOut += amount;
        }
      }

      const customerReceivable =
        Number(
          receivableSummary.customerReceivablePaise ||
            0
        );

      const supplierPayable =
        Number(
          receivableSummary.supplierPayablePaise ||
            0
        );

      const outputGst =
        Number(
          gstSummary.salesGstPaise ||
            gstSummary.outputGstPaise ||
            0
        );

      const inputGst =
        Number(
          gstSummary.purchaseInputGstPaise ||
            gstSummary.purchaseGstPaise ||
            0
        );

      const creditNoteGst =
        Number(
          gstSummary.creditNoteGstPaise ||
            0
        );

      setData({
        sales: {
          count: Number(
            receivableData.salesCount || 0
          ),
          totalPaise: salesTotal,
        },

        purchases: {
          count: Number(
            receivableData.purchaseCount || 0
          ),
          totalPaise: purchaseTotal,
        },

        margin: {
          grossMarginPaise:
            salesTotal - purchaseTotal,

          grossMarginPercent:
            salesTotal > 0
              ? ((salesTotal - purchaseTotal) /
                  salesTotal) *
                100
              : 0,
        },

        receivable: {
          totalPaise: customerReceivable,
          accounts: Number(
            receivableSummary.outstandingCustomerCount ||
              0
          ),
        },

        payable: {
          totalPaise: supplierPayable,
          accounts: Number(
            receivableSummary.outstandingSupplierCount ||
              0
          ),
        },

        stock: {
          quantity: 0,
          valuePaise: 0,
          products: 0,
        },

        cash: {
          moneyInPaise: moneyIn,
          moneyOutPaise: moneyOut,
          netMovementPaise:
            moneyIn - moneyOut,
        },

        gst: {
          inputGstPaise: inputGst,
          outputGstPaise: outputGst,
          creditNoteGstPaise:
            creditNoteGst,

          netGstPaise:
            outputGst -
            creditNoteGst -
            inputGst,
        },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load management dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const workingCapital = useMemo(() => {
    if (!data) {
      return 0;
    }

    return (
      data.receivable.totalPaise -
      data.payable.totalPaise
    );
  }, [data]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            Loading management accounting dashboard...
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl space-y-5">

          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
              Management Accounting
            </p>

            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
              Management Dashboard
            </h1>
          </div>

          <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <p className="font-bold text-red-800">
              Dashboard data could not be loaded.
            </p>

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={loadDashboard}
              className="mt-4 rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white"
            >
              Retry
            </button>
          </section>

        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 print:bg-white">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
              OfficeKart Finance
            </p>

            <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
              Management Accounting Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Management-level view of sales, purchases,
              working capital, GST and cash movement.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">

            <Link
              href="/admin/accounting/receivable-payable"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Receivable / Payable
            </Link>

            <Link
              href="/admin/accounting/gst"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              GST Control
            </Link>

            <Link
              href="/admin/accounting/cash-bank"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Cash / Bank
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

        {/* NOTICE */}

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">

          <p className="text-sm font-bold text-amber-900">
            Management Information Notice
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            This dashboard is an internal management-control view
            generated from OfficeKart transaction records. It is
            not an independently audited financial statement and
            does not replace statutory accounting, tax filing or
            external bank reconciliation.
          </p>

        </section>

        {/* FINANCIAL OVERVIEW */}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Sales
            </p>

            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {money(data.sales.totalPaise)}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {number(data.sales.count)} transaction(s)
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">
              Purchases
            </p>

            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {money(data.purchases.totalPaise)}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {number(data.purchases.count)} transaction(s)
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">

            <p className="text-xs font-bold uppercase text-slate-400">
              Gross Margin
            </p>

            <p className="mt-2 text-3xl font-extrabold text-emerald-700">
              {money(data.margin.grossMarginPaise)}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Indicative margin:
              {" "}
              {data.margin.grossMarginPercent.toFixed(2)}%
            </p>

          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">

            <p className="text-xs font-bold uppercase text-slate-400">
              Working Capital Exposure
            </p>

            <p className="mt-2 text-3xl font-extrabold text-blue-700">
              {money(workingCapital)}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Receivable minus payable
            </p>

          </div>

        </section>

        {/* RECEIVABLE / PAYABLE */}

        <section className="grid gap-4 md:grid-cols-2">

          <div className="rounded-3xl bg-white p-6 shadow-sm">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-xs font-bold uppercase text-slate-400">
                  Customer Receivable
                </p>

                <p className="mt-2 text-3xl font-extrabold text-orange-700">
                  {money(data.receivable.totalPaise)}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {number(data.receivable.accounts)}
                  {" "}
                  outstanding customer account(s)
                </p>
              </div>

              <Link
                href="/admin/accounting/receivable-payable"
                className="text-sm font-bold text-blue-600 hover:underline"
              >
                View
              </Link>

            </div>

          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-xs font-bold uppercase text-slate-400">
                  Supplier Payable
                </p>

                <p className="mt-2 text-3xl font-extrabold text-red-700">
                  {money(data.payable.totalPaise)}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {number(data.payable.accounts)}
                  {" "}
                  outstanding supplier account(s)
                </p>
              </div>

              <Link
                href="/admin/accounting/receivable-payable"
                className="text-sm font-bold text-blue-600 hover:underline"
              >
                View
              </Link>

            </div>

          </div>

        </section>

        {/* CASH */}

        <section className="rounded-3xl bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Cash & Bank Movement
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Derived from successful payment records.
              </p>
            </div>

            <Link
              href="/admin/accounting/cash-bank"
              className="font-bold text-blue-600 hover:underline"
            >
              Open Reconciliation
            </Link>

          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl bg-emerald-50 p-5">

              <p className="text-xs font-bold uppercase text-emerald-700">
                Money In
              </p>

              <p className="mt-2 text-2xl font-extrabold text-emerald-800">
                {money(data.cash.moneyInPaise)}
              </p>

            </div>

            <div className="rounded-2xl bg-red-50 p-5">

              <p className="text-xs font-bold uppercase text-red-700">
                Money Out
              </p>

              <p className="mt-2 text-2xl font-extrabold text-red-800">
                {money(data.cash.moneyOutPaise)}
              </p>

            </div>

            <div className="rounded-2xl bg-slate-100 p-5">

              <p className="text-xs font-bold uppercase text-slate-600">
                Net Movement
              </p>

              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {money(data.cash.netMovementPaise)}
              </p>

            </div>

          </div>

        </section>

        {/* GST */}

        <section className="rounded-3xl bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                GST Management View
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Summary of stored GST control records.
              </p>
            </div>

            <Link
              href="/admin/accounting/gst"
              className="font-bold text-blue-600 hover:underline"
            >
              Open GST Control
            </Link>

          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">

            <div className="rounded-2xl bg-slate-50 p-5">

              <p className="text-xs font-bold uppercase text-slate-400">
                Input GST
              </p>

              <p className="mt-2 text-xl font-extrabold">
                {money(data.gst.inputGstPaise)}
              </p>

            </div>

            <div className="rounded-2xl bg-slate-50 p-5">

              <p className="text-xs font-bold uppercase text-slate-400">
                Output GST
              </p>

              <p className="mt-2 text-xl font-extrabold">
                {money(data.gst.outputGstPaise)}
              </p>

            </div>

            <div className="rounded-2xl bg-slate-50 p-5">

              <p className="text-xs font-bold uppercase text-slate-400">
                Credit Note GST
              </p>

              <p className="mt-2 text-xl font-extrabold">
                {money(data.gst.creditNoteGstPaise)}
              </p>

            </div>

            <div className="rounded-2xl bg-blue-50 p-5">

              <p className="text-xs font-bold uppercase text-blue-700">
                Net GST View
              </p>

              <p className="mt-2 text-xl font-extrabold text-blue-800">
                {money(data.gst.netGstPaise)}
              </p>

            </div>

          </div>

        </section>

        {/* STOCK CONTROL */}

        <section className="rounded-3xl bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Inventory Management
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Inventory valuation is reserved for the dedicated
                stock valuation control module.
              </p>
            </div>

            <Link
              href="/admin/products"
              className="font-bold text-blue-600 hover:underline"
            >
              Open Products
            </Link>

          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-5">

            <p className="font-bold text-slate-700">
              Stock valuation control
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              The management dashboard does not invent a stock
              valuation figure. Product quantity and valuation
              methodology must come from the dedicated inventory
              valuation logic so that purchase cost, returns,
              adjustments and reversals remain traceable.
            </p>

          </div>

        </section>

        {/* MANAGEMENT CONTROL MATRIX */}

        <section className="rounded-3xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-extrabold text-slate-900">
            Management Control Matrix
          </h2>

          <div className="mt-5 overflow-x-auto">

            <table className="min-w-full text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                <tr>
                  <th className="px-5 py-4">
                    Control
                  </th>

                  <th className="px-5 py-4">
                    Source
                  </th>

                  <th className="px-5 py-4">
                    Purpose
                  </th>

                  <th className="px-5 py-4">
                    Drill Down
                  </th>
                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                <tr>
                  <td className="px-5 py-4 font-bold">
                    Receivable
                  </td>

                  <td className="px-5 py-4">
                    Customer Ledger
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    Outstanding customer exposure
                  </td>

                  <td className="px-5 py-4">
                    <Link
                      href="/admin/accounting/receivable-payable"
                      className="font-bold text-blue-600 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>

                <tr>
                  <td className="px-5 py-4 font-bold">
                    Payable
                  </td>

                  <td className="px-5 py-4">
                    Supplier Ledger
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    Outstanding supplier exposure
                  </td>

                  <td className="px-5 py-4">
                    <Link
                      href="/admin/accounting/receivable-payable"
                      className="font-bold text-blue-600 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>

                <tr>
                  <td className="px-5 py-4 font-bold">
                    GST
                  </td>

                  <td className="px-5 py-4">
                    GST Records
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    Input/output/reversal reconciliation
                  </td>

                  <td className="px-5 py-4">
                    <Link
                      href="/admin/accounting/gst"
                      className="font-bold text-blue-600 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>

                <tr>
                  <td className="px-5 py-4 font-bold">
                    Cash / Bank
                  </td>

                  <td className="px-5 py-4">
                    Payment Register
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    Receipt, payment and reversal movement
                  </td>

                  <td className="px-5 py-4">
                    <Link
                      href="/admin/accounting/cash-bank"
                      className="font-bold text-blue-600 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>

                <tr>
                  <td className="px-5 py-4 font-bold">
                    Audit
                  </td>

                  <td className="px-5 py-4">
                    Audit Log
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    Actor, action, reference and change trace
                  </td>

                  <td className="px-5 py-4">
                    <Link
                      href="/admin/audit"
                      className="font-bold text-blue-600 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>

              </tbody>

            </table>

          </div>

        </section>

        {/* ACCOUNTING PRINCIPLES */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6">

          <h2 className="text-lg font-extrabold">
            Accounting Control Principles
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-bold">
                No destructive correction
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Financial corrections should be represented
                through controlled reversal/correction records.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-bold">
                Traceable transactions
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Payment, ledger, GST and operational records
                should remain connected through references.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-bold">
                Audit visibility
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Important accounting actions should retain actor,
                timestamp, action and transaction context.
              </p>
            </div>

          </div>

        </section>

      </div>
    </main>
  );
}