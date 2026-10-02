"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type ReturnItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  product?: {
    id: string;
    name: string;
    sku: string | null;
    category: string | null;
    image: string | null;
  } | null;
};

type SalesReturn = {
  id: string;
  returnNumber: string;
  orderId: string;
  customerId: string;
  status: string;
  reason: string;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  refundStatus: string;
  refundAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: ReturnItem[];
  order?: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    paymentStatus: string;
    orderStatus: string;
    createdAt: string;
  } | null;
  customer?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    companyName: string | null;
    gstin: string | null;
  } | null;
};

type RefundPayment = {
  id: string;
  paymentNumber: string;
  type: string;
  status: string;
  amountPaise: number;
  method: string;
  reference: string | null;
  notes: string | null;
  paidAt: string;
  createdAt: string;
};

export default function SalesReturnDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [salesReturn, setSalesReturn] =
    useState<SalesReturn | null>(null);

  const [refundPayment, setRefundPayment] =
    useState<RefundPayment | null>(null);

  const [loading, setLoading] = useState(true);
  const [refundLoading, setRefundLoading] = useState(false);
  const [cancelLoading, setCancelLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] =
    useState("BANK_TRANSFER");
  const [refundReference, setRefundReference] =
    useState("");
  const [refundNotes, setRefundNotes] = useState("");

  const [showCancelBox, setShowCancelBox] =
    useState(false);
  const [cancelReason, setCancelReason] =
    useState("");

  async function loadReturn() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/returns/${id}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to load sales return."
        );
      }

      const item: SalesReturn = data.return;

      setSalesReturn(item);

      setRefundAmount(
        Number(item.refundAmount || 0).toFixed(2)
      );

      if (item.refundStatus === "REFUNDED") {
        try {
          const paymentResponse = await fetch(
            `/api/admin/payments?orderId=${encodeURIComponent(
              item.orderId
            )}&type=REFUND`,
            {
              cache: "no-store",
            }
          );

          if (paymentResponse.ok) {
            const paymentData =
              await paymentResponse.json();

            const payments = Array.isArray(
              paymentData.payments
            )
              ? paymentData.payments
              : [];

            const matched = payments.find(
              (payment: RefundPayment) =>
                payment.type === "REFUND"
            );

            if (matched) {
              setRefundPayment(matched);
            }
          }
        } catch {
          // Payment history is supplementary.
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load sales return."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      loadReturn();
    }
  }, [id]);

  async function processRefund() {
    if (!salesReturn) {
      return;
    }

    const amount = Number(refundAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid refund amount.");
      return;
    }

    if (amount > salesReturn.refundAmount) {
      setError(
        `Refund cannot exceed ₹${salesReturn.refundAmount.toFixed(
          2
        )}.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Process refund of ₹${amount.toFixed(
        2
      )} for ${salesReturn.returnNumber}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setRefundLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/returns/${salesReturn.id}/refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            method: refundMethod,
            reference:
              refundReference.trim() || null,
            notes:
              refundNotes.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Refund failed."
        );
      }

      setSuccess(
        "Refund processed successfully."
      );

      if (data.payment) {
        setRefundPayment(data.payment);
      }

      await Promise.all([
        loadReturn(),
        loadInvoices(),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Refund failed."
      );
    } finally {
      setRefundLoading(false);
    }
  }

  async function cancelReturn() {
    if (!salesReturn) {
      return;
    }

    const reason = cancelReason.trim();

    if (!reason) {
      setError(
        "Cancellation reason is required."
      );
      return;
    }

    if (salesReturn.refundStatus === "REFUNDED") {
      setError(
        "A refunded return cannot be cancelled directly."
      );
      return;
    }

    const confirmed = window.confirm(
      `Cancel sales return ${salesReturn.returnNumber}? This will reverse the stock received from this return.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancelLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/returns/${salesReturn.id}/cancel`,
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
        throw new Error(
          data.error ||
            "Failed to cancel sales return."
        );
      }

      setShowCancelBox(false);
      setCancelReason("");

      setSuccess(
        "Sales return cancelled and stock reversal completed."
      );

      await Promise.all([
        loadReturn(),
        loadInvoices(),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to cancel sales return."
      );
    } finally {
      setCancelLoading(false);
    }
  }

  function money(value: number) {
    return `₹${Number(value || 0).toFixed(2)}`;
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  if (loading) {
    const createCreditNote = async () => {
    if (!salesReturn) {
      return;
    }

    if (salesReturn.status === "CANCELLED") {
      setError("A cancelled sales return cannot receive a Credit Note.");
      return;
    }

    setCreditNoteLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/returns/${salesReturn.id}/credit-note`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason:
              creditNoteReason.trim() ||
              salesReturn.reason ||
              "Sales return",
            notes:
              creditNoteNotes.trim() ||
              undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to create Credit Note."
        );
      }

      setCreditNote(data.creditNote);

      setSuccess(
        `Credit Note ${data.creditNote.creditNoteNumber} created successfully.`
      );

      setCreditNoteReason("");
      setCreditNoteNotes("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create Credit Note."
      );
    } finally {
      setCreditNoteLoading(false);
    }
  };
  return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            Loading sales return...
          </div>
        </div>
      </main>
    );
  }

  if (!salesReturn) {
    const createCreditNote = async () => {
    if (!salesReturn) {
      return;
    }

    if (salesReturn.status === "CANCELLED") {
      setError("A cancelled sales return cannot receive a Credit Note.");
      return;
    }

    setCreditNoteLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/returns/${salesReturn.id}/credit-note`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason:
              creditNoteReason.trim() ||
              salesReturn.reason ||
              "Sales return",
            notes:
              creditNoteNotes.trim() ||
              undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to create Credit Note."
        );
      }

      setCreditNote(data.creditNote);

      setSuccess(
        `Credit Note ${data.creditNote.creditNoteNumber} created successfully.`
      );

      setCreditNoteReason("");
      setCreditNoteNotes("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create Credit Note."
      );
    } finally {
      setCreditNoteLoading(false);
    }
  };
  return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              Sales return not found
            </h1>

            {error && (
              <p className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <Link
              href="/admin/returns"
              className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
            >
              Back to Returns
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const canRefund =
    salesReturn.status !== "CANCELLED" &&
    salesReturn.refundStatus !== "REFUNDED";

  const canCancel =
    salesReturn.status !== "CANCELLED" &&
    salesReturn.refundStatus !== "REFUNDED";

  const createCreditNote = async () => {
    if (!salesReturn) {
      return;
    }

    if (salesReturn.status === "CANCELLED") {
      setError("A cancelled sales return cannot receive a Credit Note.");
      return;
    }

    setCreditNoteLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/returns/${salesReturn.id}/credit-note`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason:
              creditNoteReason.trim() ||
              salesReturn.reason ||
              "Sales return",
            notes:
              creditNoteNotes.trim() ||
              undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to create Credit Note."
        );
      }

      setCreditNote(data.creditNote);

      setSuccess(
        `Credit Note ${data.creditNote.creditNoteNumber} created successfully.`
      );

      setCreditNoteReason("");
      setCreditNoteNotes("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create Credit Note."
      );
    } finally {
      setCreditNoteLoading(false);
    }
  };
  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/admin/returns"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              ← Back to Sales Returns
            </Link>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              {salesReturn.returnNumber}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Created {formatDate(salesReturn.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-4 py-2 text-xs font-bold ${
                salesReturn.status === "CANCELLED"
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {salesReturn.status}
            </span>

            <span
              className={`rounded-full px-4 py-2 text-xs font-bold ${
                salesReturn.refundStatus === "REFUNDED"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              REFUND: {salesReturn.refundStatus}
            </span>

            {canCancel && (
              <button
                type="button"
                onClick={() =>
                  setShowCancelBox((value) => !value)
                }
                className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
              >
                Cancel Return
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
            >
              Print
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
            {success}
          </div>
        )}

        {showCancelBox && canCancel && (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-red-800">
              Cancel Sales Return
            </h2>

            <p className="mt-1 text-sm text-red-700">
              Cancellation will reverse the stock that
              was added by this sales return.
            </p>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-bold text-red-900">
                Cancellation Reason
              </label>

              <textarea
                value={cancelReason}
                onChange={(e) =>
                  setCancelReason(e.target.value)
                }
                rows={4}
                placeholder="Enter the reason for cancelling this return..."
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 outline-none focus:border-red-500"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={cancelReturn}
                disabled={cancelLoading}
                className="rounded-xl bg-red-600 px-5 py-3 font-extrabold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelLoading
                  ? "Cancelling..."
                  : "Confirm Cancellation"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCancelBox(false);
                  setCancelReason("");
                }}
                disabled={cancelLoading}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700"
              >
                Keep Return
              </button>
            </div>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900">
              Customer
            </h2>

            <div className="mt-4 space-y-2 text-sm">
              <p className="font-bold text-slate-900">
                {salesReturn.customer?.name ||
                  "Customer"}
              </p>

              {salesReturn.customer?.companyName && (
                <p className="text-slate-600">
                  {salesReturn.customer.companyName}
                </p>
              )}

              {salesReturn.customer?.phone && (
                <p className="text-slate-600">
                  {salesReturn.customer.phone}
                </p>
              )}

              {salesReturn.customer?.email && (
                <p className="text-slate-600">
                  {salesReturn.customer.email}
                </p>
              )}

              {salesReturn.customer?.gstin && (
                <p className="text-slate-600">
                  GSTIN: {salesReturn.customer.gstin}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900">
              Original Order
            </h2>

            <div className="mt-4 space-y-2 text-sm">
              <Link
                href={`/admin/orders/${salesReturn.orderId}`}
                className="font-bold text-blue-600 hover:underline"
              >
                {salesReturn.order?.orderNumber ||
                  salesReturn.orderId}
              </Link>

              {salesReturn.order && (
                <>
                  <p className="text-slate-600">
                    Order total:{" "}
                    <span className="font-bold text-slate-900">
                      {money(
                        salesReturn.order.totalAmount
                      )}
                    </span>
                  </p>

                  <p className="text-slate-600">
                    Payment:{" "}
                    <span className="font-semibold">
                      {salesReturn.order.paymentStatus}
                    </span>
                  </p>

                  <p className="text-slate-600">
                    Status:{" "}
                    <span className="font-semibold">
                      {salesReturn.order.orderStatus}
                    </span>
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
            <p className="text-sm font-semibold text-slate-300">
              Refund Amount
            </p>

            <p className="mt-2 text-4xl font-extrabold">
              {money(salesReturn.refundAmount)}
            </p>

            <p className="mt-2 text-sm text-slate-300">
              Refund status:{" "}
              <span className="font-bold text-white">
                {salesReturn.refundStatus}
              </span>
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Returned Products
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Reason: {salesReturn.reason}
            </p>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="px-3 py-3">
                    Product
                  </th>
                  <th className="px-3 py-3">
                    SKU
                  </th>
                  <th className="px-3 py-3 text-right">
                    Qty
                  </th>
                  <th className="px-3 py-3 text-right">
                    Rate
                  </th>
                  <th className="px-3 py-3 text-right">
                    GST
                  </th>
                  <th className="px-3 py-3 text-right">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {salesReturn.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100"
                  >
                    <td className="px-3 py-4 font-bold text-slate-900">
                      {item.product?.name ||
                        item.productId}
                    </td>

                    <td className="px-3 py-4 text-slate-500">
                      {item.product?.sku || "—"}
                    </td>

                    <td className="px-3 py-4 text-right font-semibold">
                      {item.quantity}
                    </td>

                    <td className="px-3 py-4 text-right">
                      {money(item.unitPrice)}
                    </td>

                    <td className="px-3 py-4 text-right">
                      {item.gstRate}% /{" "}
                      {money(item.gstAmount)}
                    </td>

                    <td className="px-3 py-4 text-right font-bold">
                      {money(item.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {salesReturn.notes && (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Notes
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {salesReturn.notes}
              </p>
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-900">
              Return Summary
            </h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">
                  Subtotal
                </span>

                <span className="font-semibold">
                  {money(salesReturn.subtotal)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">
                  GST
                </span>

                <span className="font-semibold">
                  {money(salesReturn.gstAmount)}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between">
                  <span className="font-extrabold text-slate-900">
                    Return Total
                  </span>

                  <span className="text-xl font-extrabold text-slate-900">
                    {money(salesReturn.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-900">
              Refund
            </h2>

            {canRefund ? (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Refund Amount
                  </label>

                  <input
                    value={refundAmount}
                    onChange={(e) =>
                      setRefundAmount(e.target.value)
                    }
                    type="number"
                    min="0"
                    max={salesReturn.refundAmount}
                    step="0.01"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Payment Method
                  </label>

                  <select
                    value={refundMethod}
                    onChange={(e) =>
                      setRefundMethod(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="BANK_TRANSFER">
                      Bank Transfer
                    </option>
                    <option value="UPI">
                      UPI
                    </option>
                    <option value="CASH">
                      Cash
                    </option>
                    <option value="CARD">
                      Card Reversal
                    </option>
                    <option value="OTHER">
                      Other
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Reference / Transaction ID
                  </label>

                  <input
                    value={refundReference}
                    onChange={(e) =>
                      setRefundReference(
                        e.target.value
                      )
                    }
                    placeholder="UTR / UPI Ref / transaction ID"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Refund Notes
                  </label>

                  <textarea
                    value={refundNotes}
                    onChange={(e) =>
                      setRefundNotes(e.target.value)
                    }
                    rows={3}
                    placeholder="Optional refund notes"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={processRefund}
                  disabled={refundLoading}
                  className="w-full rounded-xl bg-green-600 px-5 py-3 font-extrabold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refundLoading
                    ? "Processing Refund..."
                    : `Process Refund ${money(
                        Number(refundAmount || 0)
                      )}`}
                </button>
              </div>
            ) : salesReturn.refundStatus ===
              "REFUNDED" ? (
              <div className="mt-5 rounded-2xl bg-green-50 p-5">
                <p className="font-extrabold text-green-800">
                  Refund Completed
                </p>

                <p className="mt-1 text-sm text-green-700">
                  This return has already been refunded.
                </p>

                {refundPayment && (
                  <div className="mt-4 space-y-2 text-sm text-green-900">
                    <p>
                      Payment:{" "}
                      <strong>
                        {refundPayment.paymentNumber}
                      </strong>
                    </p>

                    <p>
                      Amount:{" "}
                      <strong>
                        {money(
                          refundPayment.amountPaise /
                            100
                        )}
                      </strong>
                    </p>

                    <p>
                      Method:{" "}
                      <strong>
                        {refundPayment.method}
                      </strong>
                    </p>

                    {refundPayment.reference && (
                      <p>
                        Reference:{" "}
                        <strong>
                          {refundPayment.reference}
                        </strong>
                      </p>
                    )}

                    <p>
                      Date:{" "}
                      <strong>
                        {formatDate(
                          refundPayment.paidAt
                        )}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-red-50 p-5">
                <p className="font-extrabold text-red-800">
                  Return Cancelled
                </p>

                <p className="mt-1 text-sm text-red-700">
                  Refund is unavailable for a cancelled
                  return.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                GST Credit Note
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                GST reversal document linked to this Sales Return.
              </p>
            </div>

            {creditNote && (
              <span className="rounded-full bg-green-100 px-4 py-2 text-xs font-bold text-green-700">
                {creditNote.status}
              </span>
            )}
          </div>

          {creditNote ? (
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Credit Note
                </p>

                <p className="mt-2 font-extrabold text-slate-900">
                  {creditNote.creditNoteNumber}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Taxable Amount
                </p>

                <p className="mt-2 font-extrabold text-slate-900">
                  {money(
                    (creditNote.taxableAmountPaise || 0) / 100
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  GST Reversed
                </p>

                <p className="mt-2 font-extrabold text-slate-900">
                  {money(
                    (creditNote.totalGstPaise || 0) / 100
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Total
                </p>

                <p className="mt-2 font-extrabold text-slate-900">
                  {money(
                    (creditNote.totalAmountPaise || 0) / 100
                  )}
                </p>
              </div>
            </div>
          ) : salesReturn.status !== "CANCELLED" ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-extrabold text-amber-900">
                Credit Note Not Created
              </p>

              <p className="mt-1 text-sm text-amber-800">
                Create the GST Credit Note for this Sales Return.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Credit Note Reason
                  </label>

                  <input
                    value={creditNoteReason}
                    onChange={(e) =>
                      setCreditNoteReason(e.target.value)
                    }
                    placeholder={salesReturn.reason}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Notes
                  </label>

                  <input
                    value={creditNoteNotes}
                    onChange={(e) =>
                      setCreditNoteNotes(e.target.value)
                    }
                    placeholder="Optional Credit Note notes"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={createCreditNote}
                disabled={creditNoteLoading}
                className="mt-4 rounded-xl bg-blue-600 px-5 py-3 font-extrabold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creditNoteLoading
                  ? "Creating Credit Note..."
                  : "Create GST Credit Note"}
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-red-50 p-5">
              <p className="font-extrabold text-red-800">
                Credit Note Unavailable
              </p>

              <p className="mt-1 text-sm text-red-700">
                This Sales Return has been cancelled.
              </p>
            </div>
          )}
        </section>
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-900">
            Return Timeline
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Return Created
              </p>

              <p className="mt-2 text-sm font-bold text-slate-900">
                {formatDate(salesReturn.createdAt)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Return Status
              </p>

              <p className="mt-2 text-sm font-bold text-slate-900">
                {salesReturn.status}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Refund Status
              </p>

              <p className="mt-2 text-sm font-bold text-slate-900">
                {salesReturn.refundStatus}
              </p>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          button,
          a {
            display: none !important;
          }

          main {
            padding: 0 !important;
          }

          .shadow-sm {
            box-shadow: none !important;
          }
        }
      `}</style>
    </main>
  );
}