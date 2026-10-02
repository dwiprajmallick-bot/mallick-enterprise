"use client";

import { useEffect, useMemo, useState } from "react";

type Supplier = {
  id: string;
  name: string;
  phone?: string | null;
  gstin?: string | null;
  status?: string | null;
};

type Product = {
  id: string;
  name: string;
  sku?: string | null;
  category?: string | null;
  stock?: number | null;
  purchasePrice?: number | null;
  sellingPrice?: number | null;
};

type PurchaseItem = {
  productId: string;
  quantity: number;
  unitCost: number;
  gstRate: number;
};

type Purchase = {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  status?: string;
  subtotalPaise?: number;
  gstPaise?: number;
  deliveryPaise?: number;
  totalPaise?: number;
  paymentStatus?: string;
  purchasedAt?: string;
  createdAt?: string;
  supplier?: Supplier;
  items?: Array<{
    id?: string;
    productId?: string;
    quantity?: number;
    unitCostPaise?: number;
    gstRate?: number;
    product?: Product;
  }>;
};

const emptyItem = (): PurchaseItem => ({
  productId: "",
  quantity: 1,
  unitCost: 0,
  gstRate: 0,
});

function moneyFromPaise(value?: number | null) {
  return `₹${((value || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([
    emptyItem(),
  ]);

  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] =
    useState("BANK_TRANSFER");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  async function fetchJson(url: string) {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message || `Request failed: ${response.status}`
      );
    }

    return data;
  }

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");

      const [purchaseData, supplierData, productData] =
        await Promise.all([
          fetchJson("/api/admin/purchases"),
          fetchJson("/api/admin/suppliers"),
          fetchJson("/api/admin/products"),
        ]);

      const purchaseRows = Array.isArray(purchaseData.purchases)
        ? purchaseData.purchases
        : Array.isArray(purchaseData.data)
          ? purchaseData.data
          : [];

      const supplierRows = Array.isArray(supplierData.suppliers)
        ? supplierData.suppliers
        : Array.isArray(supplierData.data)
          ? supplierData.data
          : [];

      const productRows = Array.isArray(productData.products)
        ? productData.products
        : Array.isArray(productData.data)
          ? productData.data
          : [];

      setPurchases(purchaseRows);
      setSuppliers(supplierRows);
      setProducts(productRows);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load purchase data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setSupplierId("");
    setItems([emptyItem()]);
    setDeliveryCharge(0);
    setPaymentAmount(0);
    setPaymentMethod("BANK_TRANSFER");
    setPaymentReference("");
    setNotes("");
  }

  function openNewPurchase() {
    resetForm();
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
  }

  function updateItem(
    index: number,
    field: keyof PurchaseItem,
    value: string | number
  ) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]:
                field === "productId"
                  ? String(value)
                  : Number(value),
            }
          : item
      )
    );
  }

  function addItem() {
    setItems((current) => [...current, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((current) => {
      if (current.length === 1) return current;
      return current.filter((_, i) => i !== index);
    });
  }

  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0) * Number(item.unitCost || 0),
      0
    );
  }, [items]);

  const gstAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const taxable =
        Number(item.quantity || 0) *
        Number(item.unitCost || 0);

      return sum + taxable * (Number(item.gstRate || 0) / 100);
    }, 0);
  }, [items]);

  const total = subtotal + gstAmount + Number(deliveryCharge || 0);

  const outstanding = Math.max(
    total - Number(paymentAmount || 0),
    0
  );

  async function createPurchase() {
    if (!supplierId) {
      setMessage("Please select a supplier.");
      return;
    }

    const validItems = items.filter(
      (item) =>
        item.productId &&
        Number(item.quantity) > 0 &&
        Number(item.unitCost) >= 0
    );

    if (validItems.length === 0) {
      setMessage("Please add at least one valid product.");
      return;
    }

    if (Number(paymentAmount) > total) {
      setMessage("Payment cannot exceed purchase total.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        "/api/admin/purchases",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplierId,

            items: validItems.map((item) => ({
              productId: item.productId,
              quantity: Number(item.quantity),
              unitCostPaise: Math.round(
                Number(item.unitCost) * 100
              ),
              gstRate: Number(item.gstRate || 0),
            })),

            deliveryPaise: Math.round(
              Number(deliveryCharge || 0) * 100
            ),

            paymentAmountPaise: Math.round(
              Number(paymentAmount || 0) * 100
            ),

            paymentMethod,

            paymentReference:
              paymentReference.trim() || undefined,

            notes: notes.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.message || "Purchase creation failed."
        );
      }

      setMessage(
        data.purchase?.purchaseNumber
          ? `Purchase ${data.purchase.purchaseNumber} created successfully.`
          : "Purchase created successfully."
      );

      setShowForm(false);
      resetForm();

      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Purchase creation failed."
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelPurchase(purchase: Purchase) {
    const reason = window.prompt(
      `Enter cancellation reason for ${purchase.purchaseNumber}:`
    );

    if (!reason || !reason.trim()) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/purchases/${purchase.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: reason.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.message || "Purchase cancellation failed."
        );
      }

      setMessage(
        `Purchase ${purchase.purchaseNumber} cancelled.`
      );

      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Purchase cancellation failed."
      );
    }
  }

  const filteredPurchases = purchases.filter((purchase) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return [
      purchase.purchaseNumber,
      purchase.supplier?.name,
      purchase.supplierId,
      purchase.status,
      purchase.paymentStatus,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(query)
      );
  });

  const receivedCount = purchases.filter(
    (purchase) =>
      String(purchase.status).toUpperCase() === "RECEIVED"
  ).length;

  const cancelledCount = purchases.filter(
    (purchase) =>
      String(purchase.status).toUpperCase() === "CANCELLED"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <header className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              দ্বীবরাজ মল্লিক • OfficeKart
            </p>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              Purchase Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Procurement, stock receiving and supplier payments.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewPurchase}
            className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white hover:bg-blue-700"
          >
            + New Purchase
          </button>
        </header>

        {message && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-800">
            {message}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Total Purchases
            </p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {purchases.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Received
            </p>
            <p className="mt-2 text-3xl font-extrabold text-green-700">
              {receivedCount}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Cancelled
            </p>
            <p className="mt-2 text-3xl font-extrabold text-red-600">
              {cancelledCount}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Suppliers
            </p>
            <p className="mt-2 text-3xl font-extrabold text-blue-700">
              {suppliers.length}
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Purchase Register
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Every purchase remains linked to its supplier.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search purchase..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 md:w-96"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              Loading purchases...
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-extrabold text-slate-800">
                No purchases found
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Create a purchase to receive stock from a supplier.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Purchase
                    </th>
                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Supplier
                    </th>
                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Items
                    </th>
                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Total
                    </th>
                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Payment
                    </th>
                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.map((purchase) => {
                    const isCancelled =
                      String(
                        purchase.status
                      ).toUpperCase() === "CANCELLED";

                    return (
                      <tr
                        key={purchase.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-5">
                          <p className="font-extrabold text-slate-900">
                            {purchase.purchaseNumber}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {purchase.purchasedAt
                              ? new Date(
                                  purchase.purchasedAt
                                ).toLocaleDateString("en-IN")
                              : "—"}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <p className="font-bold text-slate-800">
                            {purchase.supplier?.name ||
                              purchase.supplierId}
                          </p>

                          {purchase.supplier?.gstin && (
                            <p className="mt-1 text-xs text-slate-500">
                              GSTIN: {purchase.supplier.gstin}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-5 text-sm font-semibold text-slate-700">
                          {purchase.items?.length ?? "—"}
                        </td>

                        <td className="px-5 py-5">
                          <p className="font-extrabold text-slate-900">
                            {moneyFromPaise(
                              purchase.totalPaise
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            GST{" "}
                            {moneyFromPaise(
                              purchase.gstPaise
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`rounded-xl px-3 py-2 text-xs font-extrabold ${
                              String(
                                purchase.paymentStatus
                              ).toUpperCase() === "PAID"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {purchase.paymentStatus ||
                              "UNPAID"}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`rounded-xl px-3 py-2 text-xs font-extrabold ${
                              isCancelled
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {purchase.status ||
                              "RECEIVED"}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          {!isCancelled && (
                            <button
                              type="button"
                              onClick={() =>
                                cancelPurchase(purchase)
                              }
                              className="rounded-xl border border-red-200 px-4 py-2 text-xs font-extrabold text-red-600 hover:bg-red-50"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    New Purchase
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Stock received from supplier
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
                >
                  Close
                </button>
              </div>

              <div className="space-y-6 p-6">

                <section className="rounded-3xl border border-slate-200 p-5">
                  <h3 className="mb-4 text-lg font-extrabold text-slate-900">
                    Supplier
                  </h3>

                  <select
                    value={supplierId}
                    onChange={(event) =>
                      setSupplierId(event.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
                  >
                    <option value="">
                      Select Supplier
                    </option>

                    {suppliers
                      .filter(
                        (supplier) =>
                          String(
                            supplier.status || "ACTIVE"
                          ).toUpperCase() !== "INACTIVE"
                      )
                      .map((supplier) => (
                        <option
                          key={supplier.id}
                          value={supplier.id}
                        >
                          {supplier.name}
                          {supplier.gstin
                            ? ` • ${supplier.gstin}`
                            : ""}
                        </option>
                      ))}
                  </select>
                </section>

                <section className="rounded-3xl border border-slate-200 p-5">
                  <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">
                        Purchase Items
                      </h3>

                      <p className="text-sm text-slate-500">
                        Add all products received in this purchase.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addItem}
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
                    >
                      + Add Product
                    </button>
                  </div>

                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="rounded-2xl bg-slate-50 p-4"
                      >
                        <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">

                          <div>
                            <label className="mb-2 block text-xs font-bold text-slate-600">
                              Product
                            </label>

                            <select
                              value={item.productId}
                              onChange={(event) =>
                                updateItem(
                                  index,
                                  "productId",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                            >
                              <option value="">
                                Select Product
                              </option>

                              {products.map((product) => (
                                <option
                                  key={product.id}
                                  value={product.id}
                                >
                                  {product.name}
                                  {product.sku
                                    ? ` • ${product.sku}`
                                    : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-bold text-slate-600">
                              Quantity
                            </label>

                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(event) =>
                                updateItem(
                                  index,
                                  "quantity",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-bold text-slate-600">
                              Purchase Rate ₹
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitCost}
                              onChange={(event) =>
                                updateItem(
                                  index,
                                  "unitCost",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-bold text-slate-600">
                              GST %
                            </label>

                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={item.gstRate}
                              onChange={(event) =>
                                updateItem(
                                  index,
                                  "gstRate",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() =>
                                removeItem(index)
                              }
                              className="w-full rounded-xl border border-red-200 px-3 py-3 text-xs font-extrabold text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 text-right text-xs font-bold text-slate-500">
                          Line Total:{" "}
                          {money(
                            Number(item.quantity || 0) *
                              Number(item.unitCost || 0) *
                              (1 +
                                Number(item.gstRate || 0) /
                                  100)
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">

                  <div className="rounded-3xl border border-slate-200 p-5">
                    <h3 className="mb-4 text-lg font-extrabold text-slate-900">
                      Payment
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Paid Amount ₹
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(event) =>
                            setPaymentAmount(
                              Number(event.target.value)
                            )
                          }
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Payment Method
                        </label>

                        <select
                          value={paymentMethod}
                          onChange={(event) =>
                            setPaymentMethod(
                              event.target.value
                            )
                          }
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
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
                            Card
                          </option>
                          <option value="CHEQUE">
                            Cheque
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Payment Reference
                        </label>

                        <input
                          value={paymentReference}
                          onChange={(event) =>
                            setPaymentReference(
                              event.target.value
                            )
                          }
                          placeholder="UTR / transaction / cheque reference"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Notes
                        </label>

                        <textarea
                          value={notes}
                          onChange={(event) =>
                            setNotes(event.target.value)
                          }
                          rows={3}
                          placeholder="Purchase notes"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-900 p-6 text-white">
                    <h3 className="text-lg font-extrabold">
                      Purchase Summary
                    </h3>

                    <div className="mt-6 space-y-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-300">
                          Subtotal
                        </span>

                        <span className="font-bold">
                          {money(subtotal)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-300">
                          GST
                        </span>

                        <span className="font-bold">
                          {money(gstAmount)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-300">
                          Delivery
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={deliveryCharge}
                          onChange={(event) =>
                            setDeliveryCharge(
                              Number(event.target.value)
                            )
                          }
                          className="w-36 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-right text-white outline-none"
                        />
                      </div>

                      <div className="border-t border-slate-700 pt-4">
                        <div className="flex justify-between text-lg">
                          <span className="font-extrabold">
                            Total
                          </span>

                          <span className="font-extrabold">
                            {money(total)}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between text-green-300">
                        <span>Paid</span>
                        <span className="font-bold">
                          {money(
                            Number(paymentAmount || 0)
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between text-amber-300">
                        <span>Outstanding</span>
                        <span className="font-bold">
                          {money(outstanding)}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 md:flex-row md:justify-end">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={createPurchase}
                    disabled={saving}
                    className="rounded-2xl bg-blue-600 px-8 py-3 text-sm font-extrabold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Creating Purchase..."
                      : "Create Purchase & Receive Stock"}
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
