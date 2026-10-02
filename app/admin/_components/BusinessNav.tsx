"use client";

import Link from "next/link";

const links = [
  {
    href: "/admin",
    label: "Dashboard",
  },
  {
    href: "/admin/business",
    label: "Business",
  },
  {
    href: "/admin/suppliers",
    label: "Suppliers",
  },
  {
    href: "/admin/purchases",
    label: "Purchases",
  },
  {
    href: "/admin/invoices",
    label: "Invoices",
  },
  {
    href: "/admin/payments",
    label: "Payments",
  },
  {
    href: "/admin/ledger",
    label: "Ledger",
  },
  {
    href: "/admin/gst",
    label: "GST",
  },
  {
    href: "/admin/documents",
    label: "Documents",
  },
  {
    href: "/admin/audit-logs",
    label: "Audit Logs",
  },
];

export default function BusinessNav() {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-4 py-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          {link.label}
        </Link>
      ))}
    <a
  href="/admin/supplier-payments"
  className="rounded-xl px-3 py-2 font-bold text-slate-700 hover:bg-slate-100"
>
  Supplier Payments
</a>
</nav>
  );
}