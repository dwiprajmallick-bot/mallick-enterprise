"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  unit: string;
  stock: number;
  image: string | null;
  description: string | null;
  active: boolean;
  createdAt: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [message, setMessage] = useState("");

  async function loadProducts() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/admin/products", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to load products");
      }

      setProducts(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load products"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const categories = useMemo(() => {
    return Array.from(
      new Set(products.map((product) => product.category).filter(Boolean))
    ).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !searchText ||
        product.name.toLowerCase().includes(searchText) ||
        product.category.toLowerCase().includes(searchText) ||
        product.unit.toLowerCase().includes(searchText);

      const matchesCategory =
        category === "ALL" || product.category === category;

      const matchesStock =
        stockFilter === "ALL" ||
        (stockFilter === "LOW" && product.stock > 0 && product.stock <= 10) ||
        (stockFilter === "OUT" && product.stock === 0) ||
        (stockFilter === "IN" && product.stock > 10);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, search, category, stockFilter]);

  const totalProducts = products.length;
  const activeProducts = products.filter((product) => product.active).length;
  const lowStockProducts = products.filter(
    (product) => product.stock > 0 && product.stock <= 10
  ).length;
  const outOfStockProducts = products.filter(
    (product) => product.stock === 0
  ).length;

  async function toggleProduct(product: Product) {
    const confirmed = window.confirm(
      product.active
        ? `Deactivate "${product.name}"?`
        : `Activate "${product.name}"?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: !product.active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to update product");
      }

      await loadProducts();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update product"
      );
    }
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Delete "${product.name}" permanently?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to delete product");
      }

      await loadProducts();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to delete product"
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Link
                href="/admin"
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                ← Dashboard
              </Link>

              <span className="text-slate-300">/</span>

              <span className="text-sm text-slate-500">
                Products
              </span>
            </div>

            <h1 className="text-3xl font-black text-slate-900">
              Product Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage products, prices, categories and stock.
            </p>
          </div>

          <Link
            href="/admin/products/new"
            className="rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white shadow hover:bg-blue-700"
          >
            + Add Product
          </Link>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {message}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              Total Products
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {totalProducts}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              Active Products
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-600">
              {activeProducts}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              Low Stock
            </p>
            <p className="mt-2 text-3xl font-black text-amber-600">
              {lowStockProducts}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-500">
              Out of Stock
            </p>
            <p className="mt-2 text-3xl font-black text-red-600">
              {outOfStockProducts}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, category..."
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="ALL">All Stock</option>
              <option value="IN">In Stock</option>
              <option value="LOW">Low Stock</option>
              <option value="OUT">Out of Stock</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-black text-slate-900">
                Products
              </h2>
              <p className="text-xs text-slate-500">
                Showing {filteredProducts.length} of {products.length}
              </p>
            </div>

            <button
              onClick={loadProducts}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-bold text-slate-700">
                No products found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Product</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Purchase</th>
                    <th className="px-5 py-4">Selling</th>
                    <th className="px-5 py-4">Stock</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => {
                    const profit =
                      product.sellingPrice - product.purchasePrice;

                    return (
                      <tr key={product.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">
                            {product.name}
                          </div>

                          <div className="text-xs text-slate-500">
                            Unit: {product.unit}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {product.category}
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-700">
                          ₹{product.purchasePrice.toFixed(2)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">
                            ₹{product.sellingPrice.toFixed(2)}
                          </div>

                          <div
                            className={
                              profit >= 0
                                ? "text-xs font-semibold text-emerald-600"
                                : "text-xs font-semibold text-red-600"
                            }
                          >
                            Profit ₹{profit.toFixed(2)}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={
                              product.stock === 0
                                ? "font-bold text-red-600"
                                : product.stock <= 10
                                  ? "font-bold text-amber-600"
                                  : "font-bold text-emerald-600"
                            }
                          >
                            {product.stock} {product.unit}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={
                              product.active
                                ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
                                : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
                            }
                          >
                            {product.active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                            >
                              Edit
                            </Link>

                            <button
                              onClick={() => toggleProduct(product)}
                              className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50"
                            >
                              {product.active ? "Deactivate" : "Activate"}
                            </button>

                            <button
                              onClick={() => deleteProduct(product)}
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
