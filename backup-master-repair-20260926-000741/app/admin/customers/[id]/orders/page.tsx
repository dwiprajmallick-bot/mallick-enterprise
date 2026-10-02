"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  companyName: string | null;
  gstin: string | null;
};

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

export default function NewCustomerOrderPage() {
  const params = useParams();
  const router = useRouter();

  const customerId = String(params.id);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const customerResponse = await fetch(
        `/api/admin/customers/${customerId}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const customerResult = await customerResponse.json();

      if (!customerResponse.ok || !customerResult.success) {
        throw new Error(
          customerResult.message || "Failed to load customer."
        );
      }

      setCustomer(customerResult.data);

      const productsResponse = await fetch(
        "/api/admin/products",
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const productsResult = await productsResponse.json();

      if (productsResponse.ok && productsResult.success) {
        setProducts(productsResult.data || []);
      } else {
        setProducts([]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load order data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (customerId) {
      loadData();
    }
  }, [customerId]);

  async function createOrder(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    if (!productId) {
      setError("Please select a product.");
      return;
    }

    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/admin/customers/${customerId}/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            productId,
            quantity: qty,
            notes: notes.trim() || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to create order."
        );
      }

      alert("Order created successfully.");

      router.push(`/admin/customers/${customerId}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create order."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-12 text-center shadow-sm">
          <p className="font-bold text-slate-500">
            Loading...
          </p>
        </div>
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Customer Not Found
          </h1>

          <p className="mt-2 text-red-600">
            {error || "Customer could not be loaded."}
          </p>

          <Link
            href="/admin/customers"
            className="mt-6 inline-block rounded-xl bg-blue-700 px-5 py-3 font-extrabold text-white"
          >
            ← Back to Customers
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">

        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-extrabold tracking-widest text-blue-700">
              OFFICEKART
            </p>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              Create New Order
            </h1>

            <p className="mt-2 text-slate-600">
              Create an order for this customer.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/customers/${customerId}`}
              className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-700 shadow-sm"
            >
              ← Customer
            </Link>

            <Link
              href="/admin"
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white"
            >
              Dashboard
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">

          <section className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-xl font-extrabold text-slate-900">
              Order Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select a product and quantity.
            </p>

            <form onSubmit={createOrder} className="mt-6">

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Product *
                </label>

                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="">
                    Select Product
                  </option>

                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name} — ₹{product.price} — Stock:{" "}
                      {product.stock}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Quantity *
                </label>

                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Notes
                </label>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  placeholder="Optional order notes..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-green-600 px-6 py-3 font-extrabold text-white hover:bg-green-700 disabled:bg-slate-300"
                >
                  {saving
                    ? "Creating Order..."
                    : "Create Order"}
                </button>
              </div>

            </form>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-900">
              Customer
            </h2>

            <div className="mt-5 space-y-4">

              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-xs font-bold text-blue-600">
                  Name
                </p>

                <p className="mt-1 text-lg font-extrabold text-slate-900">
                  {customer.name}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">
                  Phone
                </p>

                <p className="mt-1 font-extrabold text-slate-900">
                  {customer.phone}
                </p>
              </div>

              {customer.companyName && (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">
                    Company
                  </p>

                  <p className="mt-1 font-extrabold text-slate-900">
                    {customer.companyName}
                  </p>
                </div>
              )}

              {customer.gstin && (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">
                    GSTIN
                  </p>

                  <p className="mt-1 font-extrabold text-slate-900">
                    {customer.gstin}
                  </p>
                </div>
              )}

            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
