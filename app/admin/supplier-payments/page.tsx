"use client";

import { useEffect, useMemo, useState } from "react";

type PayableRow = {
  purchaseId: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  totalPaise: number;
  paidPaise: number;
  outstandingPaise: number;
  paymentStatus: string;
};

type Payment = {
  id: string;
  paymentNumber: string;
  supplierId: string;
  purchaseId: string | null;
  amountPaise: number;
  paymentMethod: string;
  transactionReference: string | null;
  paymentDate: string;
  status: string;
  notes: string | null;
  reversedAt: string | null;
};

function money(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function SupplierPaymentsPage() {
  const [payables, setPayables] = useState<PayableRow[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [supplierId, setSupplierId] = useState("");
  const [purchaseId, setPurchaseId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [payableResponse, paymentResponse] =
        await Promise.all([
          fetch("/api/admin/supplier-payables", {
            cache: "no-store",
          }),
          fetch("/api/admin/supplier-payments", {
            cache: "no-store",
          }),
        ]);

      const payableData = await payableResponse.json();
      const paymentData = await paymentResponse.json();

      if (!payableResponse.ok || !payableData.success) {
        throw new Error(
          payableData.error || "Failed to load payables."
        );
      }

      if (!paymentResponse.ok || !paymentData.success) {
        throw new Error(
          paymentData.error || "Failed to load payments."
        );
      }

      setPayables(payableData.rows ?? []);
      setPayments(paymentData.payments ?? []);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to load supplier payments."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selectedPurchase = useMemo(
    () =>
      payables.find(
        (item) => item.purchaseId === purchaseId
      ),
    [payables, purchaseId]
  );

  async function createPayment() {
    setError("");

    if (!supplierId) {
      setError("Select a supplier.");
      return;
    }

    if (!amount) {
      setError("Enter payment amount.");
      return;
    }

    const amountPaise = Math.round(Number(amount) * 100);

    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    const response = await fetch(
      "/api/admin/supplier-payments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplierId,
          purchaseId: purchaseId || null,
          amountPaise,
          paymentMethod,
          transactionReference: reference || null,
          notes: notes || null,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      setError(data.error || "Payment creation failed.");
      return;
    }

    setAmount("");
    setReference("");
    setNotes("");
    setPurchaseId("");

    await load();
  }

  async function approvePayment(id: string) {
    const response = await fetch(
      `/api/admin/supplier-payments/${id}/approve`,
      {
        method: "POST",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      setError(data.error || "Payment approval failed.");
      return;
    }

    await load();
  }

  async function postPayment(id: string) {
    const response = await fetch(
      `/api/admin/supplier-payments/${id}/post`,
      {
        method: "POST",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      setError(data.error || "Payment posting failed.");
      return;
    }

    await load();
  }

  async function reversePayment(id: string) {
    const reason = window.prompt("Enter reversal reason:");

    if (!reason) {
      return;
    }

    const response = await fetch(
      `/api/admin/supplier-payments/${id}/reverse`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      setError(data.error || "Payment reversal failed.");
      return;
    }

    await load();
  }

  const outstandingTotal = payables.reduce(
    (sum, row) => sum + row.outstandingPaise,
    0
  );

  const purchaseTotal = payables.reduce(
    (sum, row) => sum + row.totalPaise,
    0
  );

  const paidTotal = payables.reduce(
    (sum, row) => sum + row.paidPaise,
    0
  );

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-extrabold uppercase tracking-wider text-indigo-600">
            OfficeKart Accounts Payable
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-900">
            Supplier Payments
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Control supplier payable, payment approval,
            posting and reversal from one place.
          </p>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">
              Purchase Payable
            </p>
            <p className="mt-2 text-2xl font-black">
              {money(purchaseTotal)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">
              Paid
            </p>
            <p className="mt-2 text-2xl font-black text-emerald-700">
              {money(paidTotal)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-500">
              Outstanding
            </p>
            <p className="mt-2 text-2xl font-black text-red-700">
              {money(outstandingTotal)}
            </p>
          </div>

        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-black text-slate-900">
            Create Supplier Payment
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            <input
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              placeholder="Supplier ID"
              className="rounded-xl border border-slate-200 px-4 py-3"
            />

            <select
              value={purchaseId}
              onChange={(e) => {
                const id = e.target.value;
                setPurchaseId(id);

                const row = payables.find(
                  (item) => item.purchaseId === id
                );

                if (row) {
                  setSupplierId(row.supplierId);
                }
              }}
              className="rounded-xl border border-slate-200 px-4 py-3"
            >
              <option value="">
                Select purchase
              </option>

              {payables
                .filter(
                  (item) => item.outstandingPaise > 0
                )
                .map((item) => (
                  <option
                    key={item.purchaseId}
                    value={item.purchaseId}
                  >
                    {item.purchaseNumber} —{" "}
                    {item.supplierName} —{" "}
                    {money(item.outstandingPaise)}
                  </option>
                ))}
            </select>

            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount ₹"
              type="number"
              min="0"
              step="0.01"
              className="rounded-xl border border-slate-200 px-4 py-3"
            />

            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3"
            >
              <option value="BANK">Bank</option>
              <option value="UPI">UPI</option>
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
              <option value="IMPS">IMPS</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CASH">Cash</option>
            </select>

            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transaction / Cheque reference"
              className="rounded-xl border border-slate-200 px-4 py-3"
            />

            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              className="rounded-xl border border-slate-200 px-4 py-3"
            />

          </div>

          {selectedPurchase && (
            <div className="mt-4 rounded-2xl bg-indigo-50 p-4 text-sm">
              <p className="font-black text-indigo-900">
                Selected Purchase
              </p>

              <p className="mt-1 text-indigo-800">
                {selectedPurchase.purchaseNumber}
                {" — "}
                Outstanding:{" "}
                {money(selectedPurchase.outstandingPaise)}
              </p>
            </div>
          )}

          <button
            onClick={createPayment}
            className="mt-5 rounded-xl bg-indigo-700 px-6 py-3 font-black text-white hover:bg-indigo-800"
          >
            CREATE DRAFT PAYMENT
          </button>

        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Supplier Outstanding
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Purchase-wise payable register
              </p>
            </div>

            <button
              onClick={load}
              className="rounded-xl border border-slate-200 px-4 py-2 font-bold"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="mt-6 text-center text-slate-500">
              Loading...
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">

                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <th className="px-3 py-3">Purchase</th>
                    <th className="px-3 py-3">Supplier</th>
                    <th className="px-3 py-3">Total</th>
                    <th className="px-3 py-3">Paid</th>
                    <th className="px-3 py-3">Outstanding</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {payables.map((row) => (
                    <tr
                      key={row.purchaseId}
                      className="border-b border-slate-100"
                    >
                      <td className="px-3 py-4 font-bold">
                        {row.purchaseNumber}
                      </td>

                      <td className="px-3 py-4">
                        {row.supplierName}
                      </td>

                      <td className="px-3 py-4">
                        {money(row.totalPaise)}
                      </td>

                      <td className="px-3 py-4 text-emerald-700">
                        {money(row.paidPaise)}
                      </td>

                      <td className="px-3 py-4 font-black text-red-700">
                        {money(row.outstandingPaise)}
                      </td>

                      <td className="px-3 py-4">
                        {row.paymentStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}

        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-black">
            Payment Register
          </h2>

          <div className="mt-5 overflow-x-auto">

            <table className="w-full min-w-[1100px] text-left">

              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="px-3 py-3">Payment</th>
                  <th className="px-3 py-3">Purchase</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Method</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>

              <tbody>

                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-slate-100"
                  >

                    <td className="px-3 py-4 font-bold">
                      {payment.paymentNumber}
                    </td>

                    <td className="px-3 py-4">
                      {payment.purchaseId ?? "Supplier-level"}
                    </td>

                    <td className="px-3 py-4 font-black">
                      {money(payment.amountPaise)}
                    </td>

                    <td className="px-3 py-4">
                      {payment.paymentMethod}
                    </td>

                    <td className="px-3 py-4">
                      {payment.reversedAt
                        ? "REVERSED"
                        : payment.status}
                    </td>

                    <td className="px-3 py-4">

                      <div className="flex flex-wrap gap-2">

                        {payment.status === "DRAFT" && (
                          <button
                            onClick={() =>
                              approvePayment(payment.id)
                            }
                            className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-black text-white"
                          >
                            APPROVE
                          </button>
                        )}

                        {(payment.status === "DRAFT" ||
                          payment.status === "APPROVED") && (
                          <button
                            onClick={() =>
                              postPayment(payment.id)
                            }
                            className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white"
                          >
                            POST
                          </button>
                        )}

                        {payment.status === "POSTED" &&
                          !payment.reversedAt && (
                            <button
                              onClick={() =>
                                reversePayment(payment.id)
                              }
                              className="rounded-lg bg-red-700 px-3 py-2 text-xs font-black text-white"
                            >
                              REVERSE
                            </button>
                          )}

                      </div>

                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>

        </section>

      </div>
    </main>
  );
}
