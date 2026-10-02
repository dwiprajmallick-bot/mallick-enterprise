"use client";

import { useEffect, useState } from "react";

type CreditNoteData = {
  id: string;
  creditNoteNumber: string;
  invoiceId?: string | null;
  status: string;
  taxableAmountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  cessPaise: number;
  totalGstPaise: number;
  totalAmountPaise: number;
  reason: string;
  notes?: string | null;
  issuedAt: string;
  items?: any[];
  order?: any;
  customer?: any;
  gstRecords?: any[];
};

function money(paise: number) {
  return `₹${(Number(paise || 0) / 100).toFixed(2)}`;
}

export default function CreditNoteDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState("");
  const [creditNote, setCreditNote] = useState<CreditNoteData | null>(null);
  const [salesReturn, setSalesReturn] = useState<any>(null);
  const [linkedInvoice, setLinkedInvoice] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [cancelReason, setCancelReason] = useState("");
  const [cancelNotes, setCancelNotes] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    params.then((value) => setId(value.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    loadCreditNote();
  }, [id]);

  async function loadCreditNote() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `/api/admin/returns/${id}/credit-note`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Failed to load Credit Note."
        );
      }

      setCreditNote(data.creditNote);
      setSalesReturn(data.salesReturn ?? null);

      const invoiceId = data?.creditNote?.invoiceId ?? null;

      if (invoiceId) {
        try {
          const invoiceResponse = await fetch(
            `/api/admin/invoices/${invoiceId}`,
            {
              cache: "no-store",
            }
          );

          if (invoiceResponse.ok) {
            const invoiceData = await invoiceResponse.json();

            setLinkedInvoice(
              invoiceData?.invoice ??
                invoiceData?.data ??
                invoiceData
            );
          }
        } catch {
          setLinkedInvoice(null);
        }
      } else {
        setLinkedInvoice(null);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load Credit Note."
      );
    } finally {
      setLoading(false);
    }
  }

  async function cancelCreditNote() {
    if (!creditNote) return;

    const reason = cancelReason.trim();

    if (!reason) {
      setMessage("Cancellation reason is required.");
      return;
    }

    const confirmed = window.confirm(
      `Cancel Credit Note ${creditNote.creditNoteNumber}?\n\n` +
        "This action will preserve the original record and create a GST reversal."
    );

    if (!confirmed) return;

    try {
      setCancelling(true);
      setMessage("");

      const response = await fetch(
        `/api/admin/credit-notes/${creditNote.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason,
            notes: cancelNotes.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Failed to cancel Credit Note."
        );
      }

      setMessage(
        "Credit Note cancelled successfully and GST reversal recorded."
      );

      setCancelReason("");
      setCancelNotes("");

      await loadCreditNote();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to cancel Credit Note."
      );
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8">
          Loading Credit Note...
        </div>
      </main>
    );
  }

  if (!creditNote) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8">
          <p className="font-bold text-red-600">
            {message || "Credit Note not found."}
          </p>

          <a
            href="/admin/credit-notes"
            className="mt-4 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
          >
            Back to Credit Notes
          </a>
        </div>
      </main>
    );
  }

  const customerName =
    creditNote.customer?.companyName ||
    creditNote.customer?.name ||
    "Customer";

  const invoiceNumber =
    linkedInvoice?.invoiceNumber ||
    linkedInvoice?.number ||
    creditNote.invoiceId ||
    "Invoice not available";

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between print:hidden">
          <div>
            <a
              href="/admin/credit-notes"
              className="text-sm font-bold text-blue-600"
            >
              ← Back to Credit Notes
            </a>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              Credit Note
            </h1>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
          >
            Print Credit Note
          </button>
        </div>

        {message && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
            {message}
          </div>
        )}

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Credit Note Number
              </p>

              <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                {creditNote.creditNoteNumber}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Issued:{" "}
                {new Date(creditNote.issuedAt).toLocaleString("en-IN")}
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                creditNote.status === "CANCELLED"
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {creditNote.status}
            </span>
          </div>
        </section>

        {creditNote.invoiceId && (
          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Linked Original Invoice
                </p>

                <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                  {invoiceNumber}
                </h2>

                {linkedInvoice?.status && (
                  <p className="mt-1 text-sm text-slate-600">
                    Status: {linkedInvoice.status}
                  </p>
                )}
              </div>

              <a
                href={`/admin/invoices/${creditNote.invoiceId}`}
                className="rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-blue-700"
              >
                View Invoice
              </a>
            </div>
          </section>
        )}

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Customer
            </p>

            <h2 className="mt-2 text-xl font-extrabold text-slate-900">
              {customerName}
            </h2>

            {creditNote.customer?.name && (
              <p className="mt-1 text-sm text-slate-600">
                Contact: {creditNote.customer.name}
              </p>
            )}

            {creditNote.customer?.phone && (
              <p className="mt-1 text-sm text-slate-600">
                Phone: {creditNote.customer.phone}
              </p>
            )}

            {creditNote.customer?.gstin && (
              <p className="mt-1 text-sm text-slate-600">
                GSTIN: {creditNote.customer.gstin}
              </p>
            )}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Transaction Trace
            </p>

            <div className="mt-3 space-y-2 text-sm">
              {creditNote.order?.orderNumber && (
                <p>
                  <span className="font-bold">Order:</span>{" "}
                  {creditNote.order.orderNumber}
                </p>
              )}

              {salesReturn?.returnNumber && (
                <p>
                  <span className="font-bold">Sales Return:</span>{" "}
                  {salesReturn.returnNumber}
                </p>
              )}

              {creditNote.invoiceId && (
                <p>
                  <span className="font-bold">Invoice:</span>{" "}
                  {invoiceNumber}
                </p>
              )}

              <p>
                <span className="font-bold">Reason:</span>{" "}
                {creditNote.reason}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-900">
            Returned Products
          </h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-500">
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3">Qty</th>
                  <th className="px-3 py-3">Unit Price</th>
                  <th className="px-3 py-3">Taxable</th>
                  <th className="px-3 py-3">GST</th>
                  <th className="px-3 py-3">Total</th>
                </tr>
              </thead>

              <tbody>
                {(creditNote.items || []).map((item: any) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-0"
                  >
                    <td className="px-3 py-4 font-semibold">
                      {item.product?.name ||
                        item.productName ||
                        item.productId}
                    </td>

                    <td className="px-3 py-4">
                      {item.quantity}
                    </td>

                    <td className="px-3 py-4">
                      {money(item.unitPricePaise)}
                    </td>

                    <td className="px-3 py-4">
                      {money(item.taxableAmountPaise)}
                    </td>

                    <td className="px-3 py-4">
                      {money(item.totalGstPaise)}
                    </td>

                    <td className="px-3 py-4 font-bold">
                      {money(item.totalAmountPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-900">
            GST Breakdown
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Taxable</p>
              <p className="mt-1 text-lg font-extrabold">
                {money(creditNote.taxableAmountPaise)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">CGST</p>
              <p className="mt-1 text-lg font-extrabold">
                {money(creditNote.cgstPaise)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">SGST</p>
              <p className="mt-1 text-lg font-extrabold">
                {money(creditNote.sgstPaise)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">IGST</p>
              <p className="mt-1 text-lg font-extrabold">
                {money(creditNote.igstPaise)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Total GST</p>
              <p className="mt-1 text-lg font-extrabold">
                {money(creditNote.totalGstPaise)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-900">
              Credit Summary
            </h2>

            <p className="text-2xl font-extrabold text-blue-700">
              {money(creditNote.totalAmountPaise)}
            </p>
          </div>

          {creditNote.notes && (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Notes
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {creditNote.notes}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-slate-900">
            GST Records & Audit Reference
          </h2>

          <div className="mt-5 space-y-3">
            {(creditNote.gstRecords || []).map((record: any) => (
              <div
                key={record.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-bold">
                      {record.gstNumber}
                    </p>

                    <p className="text-xs text-slate-500">
                      {record.entryType} · {record.sourceType}
                    </p>
                  </div>

                  <div className="text-sm font-bold">
                    GST: {money(record.gstPaise)}
                  </div>
                </div>
              </div>
            ))}

            {(!creditNote.gstRecords ||
              creditNote.gstRecords.length === 0) && (
              <p className="text-sm text-slate-500">
                No GST records found.
              </p>
            )}
          </div>
        </section>

        {creditNote.status !== "CANCELLED" && (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-6 print:hidden">
            <h2 className="text-xl font-extrabold text-red-800">
              Cancel Credit Note
            </h2>

            <p className="mt-2 text-sm text-red-700">
              Cancellation does not delete the Credit Note. The original
              record remains preserved and a GST reversal is created.
            </p>

            <div className="mt-5 grid gap-4">
              <input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Mandatory cancellation reason"
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500"
              />

              <textarea
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                placeholder="Additional cancellation notes"
                rows={4}
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500"
              />

              <button
                type="button"
                disabled={cancelling}
                onClick={cancelCreditNote}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {cancelling
                  ? "Cancelling..."
                  : "Confirm Credit Note Cancellation"}
              </button>
            </div>
          </section>
        )}

        {creditNote.status === "CANCELLED" && (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <h2 className="text-xl font-extrabold text-red-800">
              Credit Note Cancelled
            </h2>

            <p className="mt-2 text-sm text-red-700">
              This Credit Note is permanently marked as CANCELLED.
              The original record has not been deleted.
            </p>
          </section>
        )}

      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          .print\\:hidden {
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