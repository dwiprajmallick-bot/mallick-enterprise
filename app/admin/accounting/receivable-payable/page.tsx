"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Account = {
  id: string;
  name: string;
  companyName: string | null;
  phone: string | null;
  gstin: string | null;
  debitPaise: number;
  creditPaise: number;
  balancePaise: number;
};

type Summary = {
  customerCount: number;
  supplierCount: number;
  customerLedgerEntries: number;
  supplierLedgerEntries: number;
  customerDebitPaise: number;
  customerCreditPaise: number;
  customerReceivablePaise: number;
  supplierDebitPaise: number;
  supplierCreditPaise: number;
  supplierPayablePaise: number;
  netWorkingCapitalExposurePaise: number;
};

function money(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ReceivablePayablePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [customers, setCustomers] = useState<Account[]>([]);
  const [suppliers, setSuppliers] = useState<Account[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/admin/accounting/receivable-payable",
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Failed to load accounting dashboard."
          );
        }

        if (!active) return;

        setSummary(data.summary);
        setCustomers(data.customers || []);
        setSuppliers(data.suppliers || []);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load accounting dashboard."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((item) =>
      [
        item.name,
        item.companyName,
        item.phone,
        item.gstin,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        )
    );
  }, [customers, customerSearch]);

  const filteredSuppliers = useMemo(() => {
    const query = supplierSearch.trim().toLowerCase();

    if (!query) return suppliers;

    return suppliers.filter((item) =>
      [
        item.name,
        item.companyName,
        item.phone,
        item.gstin,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        )
    );
  }, [suppliers, supplierSearch]);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              ← Back to Admin
            </Link>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              Receivable & Payable
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Central customer receivable and supplier payable control
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            Print / Save PDF
          </button>
        </div>

        {loading && (
          <section className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="font-semibold text-slate-600">
              Loading accounting dashboard…
            </p>
          </section>
        )}

        {error && (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <p className="font-bold text-red-700">{error}</p>
          </section>
        )}

        {!loading && !error && summary && (
          <>
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <p className="text-sm font-bold text-slate-500">
                  Customer Receivable
                </p>
                <p className="mt-2 text-3xl font-extrabold text-red-700">
                  {money(summary.customerReceivablePaise)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Outstanding from customers
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <p className="text-sm font-bold text-slate-500">
                  Supplier Payable
                </p>
                <p className="mt-2 text-3xl font-extrabold text-blue-700">
                  {money(summary.supplierPayablePaise)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Outstanding to suppliers
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <p className="text-sm font-bold text-slate-500">
                  Customer Accounts
                </p>
                <p className="mt-2 text-3xl font-extrabold text-slate-900">
                  {summary.customerCount}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Ledger entries: {summary.customerLedgerEntries}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <p className="text-sm font-bold text-slate-500">
                  Supplier Accounts
                </p>
                <p className="mt-2 text-3xl font-extrabold text-slate-900">
                  {summary.supplierCount}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Ledger entries: {summary.supplierLedgerEntries}
                </p>
              </div>

            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Working Capital View
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                    Receivable vs Payable
                  </h2>
                </div>

                <div className="rounded-2xl bg-slate-50 px-5 py-4">
                  <p className="text-xs font-bold text-slate-500">
                    Net Exposure
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-900">
                    {money(
                      Math.abs(
                        summary.netWorkingCapitalExposurePaise
                      )
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">

                <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-800">
                      Customer Receivable
                    </span>
                    <span className="font-extrabold text-red-700">
                      {money(summary.customerReceivablePaise)}
                    </span>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-red-500"
                      style={{
                        width:
                          summary.customerReceivablePaise +
                            summary.supplierPayablePaise >
                          0
                            ? `${Math.min(
                                100,
                                (summary.customerReceivablePaise /
                                  (summary.customerReceivablePaise +
                                    summary.supplierPayablePaise)) *
                                  100
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-800">
                      Supplier Payable
                    </span>
                    <span className="font-extrabold text-blue-700">
                      {money(summary.supplierPayablePaise)}
                    </span>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width:
                          summary.customerReceivablePaise +
                            summary.supplierPayablePaise >
                          0
                            ? `${Math.min(
                                100,
                                (summary.supplierPayablePaise /
                                  (summary.customerReceivablePaise +
                                    summary.supplierPayablePaise)) *
                                  100
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>

              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">

              <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

                <div className="border-b border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">
                        Customer Receivable
                      </h2>
                      <p className="text-sm text-slate-500">
                        Outstanding customer accounts
                      </p>
                    </div>

                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                      {customers.length}
                    </span>
                  </div>

                  <input
                    value={customerSearch}
                    onChange={(event) =>
                      setCustomerSearch(event.target.value)
                    }
                    placeholder="Search customer, company, phone or GSTIN"
                    className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                {filteredCustomers.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="font-bold text-slate-700">
                      No outstanding customer account found.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="p-5 hover:bg-slate-50"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900">
                              {customer.name}
                            </p>

                            {customer.companyName && (
                              <p className="text-sm text-slate-500">
                                {customer.companyName}
                              </p>
                            )}

                            <p className="mt-1 text-xs text-slate-400">
                              {customer.phone || "No phone"}
                            </p>
                          </div>

                          <div className="text-left sm:text-right">
                            <p className="text-lg font-extrabold text-red-700">
                              {money(customer.balancePaise)}
                            </p>

                            <Link
                              href={`/admin/customers/${customer.id}/ledger`}
                              className="mt-1 inline-block text-xs font-bold text-blue-600 hover:underline"
                            >
                              View Ledger →
                            </Link>
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </section>

              <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

                <div className="border-b border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">
                        Supplier Payable
                      </h2>
                      <p className="text-sm text-slate-500">
                        Outstanding supplier accounts
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      {suppliers.length}
                    </span>
                  </div>

                  <input
                    value={supplierSearch}
                    onChange={(event) =>
                      setSupplierSearch(event.target.value)
                    }
                    placeholder="Search supplier, company, phone or GSTIN"
                    className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                {filteredSuppliers.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="font-bold text-slate-700">
                      No outstanding supplier account found.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredSuppliers.map((supplier) => (
                      <div
                        key={supplier.id}
                        className="p-5 hover:bg-slate-50"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900">
                              {supplier.name}
                            </p>

                            {supplier.companyName && (
                              <p className="text-sm text-slate-500">
                                {supplier.companyName}
                              </p>
                            )}

                            <p className="mt-1 text-xs text-slate-400">
                              {supplier.phone || "No phone"}
                            </p>
                          </div>

                          <div className="text-left sm:text-right">
                            <p className="text-lg font-extrabold text-blue-700">
                              {money(supplier.balancePaise)}
                            </p>

                            <Link
                              href={`/admin/suppliers/${supplier.id}/ledger`}
                              className="mt-1 inline-block text-xs font-bold text-blue-600 hover:underline"
                            >
                              View Ledger →
                            </Link>
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </section>

            </div>

            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">

              <h2 className="font-extrabold text-amber-900">
                Accounting Control & Audit Trail
              </h2>

              <div className="mt-3 grid gap-3 text-sm text-amber-800 md:grid-cols-2">
                <p>• Dashboard data is calculated from LedgerEntry records.</p>
                <p>• Customer and supplier ledger records remain immutable.</p>
                <p>• Payments and reversals remain separately traceable.</p>
                <p>• Dashboard access is recorded in the audit trail.</p>
              </div>

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
          input,
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
        }
      `}</style>
    </main>
  );
}