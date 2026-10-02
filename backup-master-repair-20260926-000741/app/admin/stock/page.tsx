"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  active: boolean;
};

type StockMovement = {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  note: string | null;
  orderId: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    category: string;
    unit: string;
    stock: number;
  };
};

const MOVEMENT_TYPES = [
  {
    value: "IN",
    label: "Stock IN",
    description: "Add stock to inventory",
  },
  {
    value: "OUT",
    label: "Stock OUT",
    description: "Remove stock from inventory",
  },
  {
    value: "ADJUSTMENT",
    label: "Adjustment",
    description: "Set the exact stock quantity",
  },
];

export default function StockManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const [productId, setProductId] = useState("");
  const [type, setType] = useState("IN");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");

  const [search, setSearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [productsResponse, movementsResponse] = await Promise.all([
        fetch("/api/admin/products", {
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/admin/stock", {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      const productsData = await productsResponse.json();
      const movementsData = await movementsResponse.json();

      if (!productsResponse.ok) {
        throw new Error(
          productsData.message ||
            productsData.error ||
            "Failed to load products"
        );
      }

      if (!movementsResponse.ok) {
        throw new Error(
          movementsData.message ||
            movementsData.error ||
            "Failed to load stock history"
        );
      }

      const productList: Product[] = Array.isArray(productsData)
        ? productsData
        : Array.isArray(productsData.data)
          ? productsData.data
          : [];

      const movementList: StockMovement[] =
        Array.isArray(movementsData)
          ? movementsData
          : Array.isArray(movementsData.data)
            ? movementsData.data
            : [];

      setProducts(productList);
      setMovements(movementList);

      if (!productId && productList.length > 0) {
        setProductId(productList[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load stock data"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId),
    [products, productId]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
    );
  }, [products, search]);

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      const matchesType =
        historyFilter === "ALL" ||
        movement.type === historyFilter;

      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        movement.product.name.toLowerCase().includes(query) ||
        movement.product.category.toLowerCase().includes(query) ||
        (movement.note || "").toLowerCase().includes(query);

      return matchesType && matchesSearch;
    });
  }, [movements, historyFilter, search]);

  const stockSummary = useMemo(() => {
    const totalProducts = products.length;
    const totalUnits = products.reduce(
      (sum, product) => sum + product.stock,
      0
    );
    const lowStock = products.filter(
      (product) => product.stock > 0 && product.stock <= 10
    ).length;
    const outOfStock = products.filter(
      (product) => product.stock === 0
    ).length;

    return {
      totalProducts,
      totalUnits,
      lowStock,
      outOfStock,
    };
  }, [products]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const parsedQuantity = Number(quantity);

    if (!productId) {
      setError("Please select a product.");
      return;
    }

    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    if (type === "OUT" && selectedProduct) {
      if (parsedQuantity > selectedProduct.stock) {
        setError(
          `Only ${selectedProduct.stock} ${selectedProduct.unit} available in stock.`
        );
        return;
      }
    }

    try {
      setSaving(true);

      const response = await fetch("/api/admin/stock", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          type,
          quantity: parsedQuantity,
          note: note.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Failed to update stock"
        );
      }

      setSuccess(
        `Stock updated successfully. New stock: ${data.data.product.stock}`
      );

      setQuantity("");
      setNote("");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update stock"
      );
    } finally {
      setSaving(false);
    }
  }

  function movementBadge(type: string) {
    if (type === "IN") {
      return "bg-green-100 text-green-700";
    }

    if (type === "OUT") {
      return "bg-red-100 text-red-700";
    }

    return "bg-blue-100 text-blue-700";
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              OfficeKart Admin
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-900">
              Stock Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage inventory, stock movement and stock history.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/products"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Products
            </Link>

            <Link
              href="/admin"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow hover:bg-blue-700"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
            {success}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Products
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {stockSummary.totalProducts}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Stock Units
            </p>
            <p className="mt-2 text-3xl font-black text-blue-600">
              {stockSummary.totalUnits}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Low Stock
            </p>
            <p className="mt-2 text-3xl font-black text-orange-500">
              {stockSummary.lowStock}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Out of Stock
            </p>
            <p className="mt-2 text-3xl font-black text-red-600">
              {stockSummary.outOfStock}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">
              Update Stock
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Record every inventory movement.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Product
                </label>

                <select
                  value={productId}
                  onChange={(event) =>
                    setProductId(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                  disabled={loading || saving}
                >
                  <option value="">
                    Select product
                  </option>

                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name} — Stock: {product.stock}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Current Stock
                  </p>

                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {selectedProduct.stock}{" "}
                    <span className="text-sm font-bold text-slate-500">
                      {selectedProduct.unit}
                    </span>
                  </p>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Movement Type
                </label>

                <div className="grid gap-2">
                  {MOVEMENT_TYPES.map((item) => (
                    <label
                      key={item.value}
                      className={`cursor-pointer rounded-xl border p-3 ${
                        type === item.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="movementType"
                          value={item.value}
                          checked={type === item.value}
                          onChange={(event) =>
                            setType(event.target.value)
                          }
                          className="mt-1"
                        />

                        <span>
                          <span className="block text-sm font-bold text-slate-800">
                            {item.label}
                          </span>

                          <span className="block text-xs text-slate-500">
                            {item.description}
                          </span>
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  {type === "ADJUSTMENT"
                    ? "New Stock Quantity"
                    : "Quantity"}
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(event.target.value)
                  }
                  required
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="Enter quantity"
                />

                {type === "ADJUSTMENT" && (
                  <p className="mt-2 text-xs text-slate-500">
                    Adjustment sets the product stock directly
                    to this number.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Note
                </label>

                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(event.target.value)
                  }
                  rows={3}
                  disabled={saving}
                  placeholder="Example: New supplier stock received"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving || loading}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Updating..." : "Update Stock"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Stock History
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Complete inventory movement record.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search product..."
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

                <select
                  value={historyFilter}
                  onChange={(event) =>
                    setHistoryFilter(event.target.value)
                  }
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Movements</option>
                  <option value="IN">Stock IN</option>
                  <option value="OUT">Stock OUT</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                </select>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              {loading ? (
                <div className="py-12 text-center text-sm font-medium text-slate-500">
                  Loading stock history...
                </div>
              ) : filteredMovements.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
                  <p className="text-sm font-bold text-slate-700">
                    No stock movement found.
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Stock IN/OUT/Adjustment records will appear
                    here.
                  </p>
                </div>
              ) : (
                <table className="w-full min-w-[850px] text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Product</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Quantity</th>
                      <th className="px-3 py-3">Stock Change</th>
                      <th className="px-3 py-3">Note</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredMovements.map((movement) => (
                      <tr
                        key={movement.id}
                        className="border-b border-slate-100"
                      >
                        <td className="px-3 py-4 text-xs text-slate-500">
                          {formatDate(movement.createdAt)}
                        </td>

                        <td className="px-3 py-4">
                          <p className="text-sm font-bold text-slate-800">
                            {movement.product.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            {movement.product.category}
                          </p>
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${movementBadge(
                              movement.type
                            )}`}
                          >
                            {movement.type}
                          </span>
                        </td>

                        <td className="px-3 py-4 text-sm font-bold text-slate-800">
                          {movement.quantity}{" "}
                          <span className="text-xs text-slate-500">
                            {movement.product.unit}
                          </span>
                        </td>

                        <td className="px-3 py-4 text-sm">
                          <span className="font-semibold text-slate-500">
                            {movement.previousStock}
                          </span>

                          <span className="mx-2 text-slate-400">
                            →
                          </span>

                          <span className="font-black text-slate-900">
                            {movement.newStock}
                          </span>
                        </td>

                        <td className="max-w-[220px] px-3 py-4 text-xs text-slate-500">
                          {movement.note || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 text-xs font-medium text-slate-500">
              Showing {filteredMovements.length} movement
              {filteredMovements.length === 1 ? "" : "s"}.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
