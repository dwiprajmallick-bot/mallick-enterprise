"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import BusinessNav from "../_components/BusinessNav";

type Summary = {
  suppliers: number;
  purchases: number;
  invoices: number;
  payments: number;
  ledger: number;
  gst: number;
  documents: number;
  orders: number;
  products: number;
  totalStock: number;
  purchaseValuePaise: number;
  invoiceValuePaise: number;
  receivedPaymentPaise: number;
  paidPaymentPaise: number;
};

function money(paise: number) {
  return `₹${(
    Number(paise || 0) / 100
  ).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function BusinessPage() {
  const [summary, setSummary] =
    useState<Summary | null>(null);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function load() {
      try {
        const response =
          await fetch(
            "/api/admin/business-summary",
            {
              credentials:
                "include",
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Unable to load summary."
          );
        }

        setSummary(
          data.summary
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load summary."
        );
      }
    }

    load();
  }, []);

  const cards = summary
    ? [
        [
          "Suppliers",
          summary.suppliers,
          "/admin/suppliers",
        ],
        [
          "Purchases",
          summary.purchases,
          "/admin/purchases",
        ],
        [
          "Invoices",
          summary.invoices,
          "/admin/invoices",
        ],
        [
          "Payments",
          summary.payments,
          "/admin/payments",
        ],
        [
          "Ledger Entries",
          summary.ledger,
          "/admin/ledger",
        ],
        [
          "GST Records",
          summary.gst,
          "/admin/gst",
        ],
        [
          "Documents",
          summary.documents,
          "/admin/documents",
        ],
        [
          "Orders",
          summary.orders,
          "/admin/orders",
        ],
        [
          "Products",
          summary.products,
          "/admin/products",
        ],
      ]
    : [];

  return (
    <main className="min-h-screen bg-slate-100">
      <BusinessNav />

      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            OfficeKart Business
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Purchase, sales, payment, GST,
            ledger and document control.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(
            ([label, value, href]) => (
              <Link
                key={href}
                href={href as string}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md"
              >
                <div className="text-sm text-slate-500">
                  {label}
                </div>

                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {value}
                </div>
              </Link>
            )
          )}
        </div>

        {summary ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 border border-slate-200">
              <p className="text-sm text-slate-500">
                Current Stock
              </p>
              <p className="mt-2 text-2xl font-bold">
                {summary.totalStock}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 border border-slate-200">
              <p className="text-sm text-slate-500">
                Purchase Value
              </p>
              <p className="mt-2 text-2xl font-bold">
                {money(
                  summary.purchaseValuePaise
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 border border-slate-200">
              <p className="text-sm text-slate-500">
                Invoice Value
              </p>
              <p className="mt-2 text-2xl font-bold">
                {money(
                  summary.invoiceValuePaise
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 border border-slate-200">
              <p className="text-sm text-slate-500">
                Net Payment Flow
              </p>
              <p className="mt-2 text-2xl font-bold">
                {money(
                  summary.receivedPaymentPaise -
                    summary.paidPaymentPaise
                )}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/suppliers"
            className="rounded-2xl bg-slate-900 p-5 text-white"
          >
            Add / Manage Supplier
          </Link>

          <Link
            href="/admin/purchases"
            className="rounded-2xl bg-white border border-slate-200 p-5"
          >
            Create Purchase
          </Link>

          <Link
            href="/admin/payments"
            className="rounded-2xl bg-white border border-slate-200 p-5"
          >
            Record Payment
          </Link>

          <Link
            href="/admin/documents"
            className="rounded-2xl bg-white border border-slate-200 p-5"
          >
            Upload Document
          </Link>
        </div>
      </div>
    </main>
  );
}