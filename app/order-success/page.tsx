"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function OrderSuccessContent() {
  const searchParams = useSearchParams();

  const orderNumber =
    searchParams.get("orderNumber") || "Your Order";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
          ?
        </div>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">
          Order Placed Successfully
        </h1>

        <p className="mt-3 text-slate-600">
          Thank you for ordering from OfficeKart.
        </p>

        <div className="mt-6 rounded-2xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">
            Order Number
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {orderNumber}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/bulk-order"
            className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white"
          >
            Continue Shopping
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-100 flex items-center justify-center"><p className="text-slate-600">Loading...</p></main>}>
      <OrderSuccessContent />
    </Suspense>
  );
}

