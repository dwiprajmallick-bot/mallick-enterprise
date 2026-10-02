"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function QuotePage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function submitQuote(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setSuccess("");
    setError("");

    try {
      const response = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
          email,
          companyName,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to submit quotation request"
        );
      }

      setSuccess(
        "Your quotation request has been submitted successfully. Our team will contact you soon."
      );

      setName("");
      setPhone("");
      setEmail("");
      setCompanyName("");
      setMessage("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              OFFICEKART
            </h1>

            <p className="text-xs font-semibold text-slate-500">
              Office Stationery & Business Supplies
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
          >
            Home
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 lg:grid-cols-2">
        <section className="flex flex-col justify-center">
          <p className="text-sm font-extrabold uppercase tracking-wide text-blue-600">
            Business Quotation
          </p>

          <h2 className="mt-3 text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl">
            Need office supplies in bulk?
          </h2>

          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Tell us what your office needs. We can prepare a quotation
            based on your required products and quantities.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="font-extrabold text-slate-900">
                🏢 Office & Corporate Supply
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Regular stationery and business supply requirements.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="font-extrabold text-slate-900">
                📦 Bulk Orders
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Share your product list and required quantities.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="font-extrabold text-slate-900">
                💰 Custom Quotation
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Get a quotation according to your business requirement.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Request a Quotation
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Fill in your details and tell us what you need.
          </p>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              {success}
            </div>
          )}

          <form
            onSubmit={submitQuote}
            className="mt-6 space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Your Name *
              </label>

              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Phone Number *
              </label>

              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Company / Office Name
              </label>

              <input
                value={companyName}
                onChange={(e) =>
                  setCompanyName(e.target.value)
                }
                placeholder="Enter company or office name"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Products / Requirement *
              </label>

              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Example: A4 paper - 50 reams, pens - 500 pcs, files - 200 pcs..."
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-5 py-4 font-extrabold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Submitting..."
                : "Request Quotation"}
            </button>
          </form>
        </section>
      </div>

      <footer className="border-t border-slate-200 bg-white py-6 text-center">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} OFFICEKART. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
