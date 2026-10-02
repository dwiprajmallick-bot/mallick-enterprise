"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
  unit: string;
  stock: number;
  image: string | null;
  description: string | null;
  active: boolean;
};

type CartItem = {
  product: Product;
  quantity: number;
};

export default function BulkOrderPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const limit = 24;

  useEffect(() => {
    loadProducts();
  }, [search, category, page]);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (category !== "All") {
        params.set("category", category);
      }

      params.set("page", String(page));
      params.set("limit", String(limit));

      const response = await fetch(
        `/api/products?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load products."
        );
      }

      setProducts(data.products || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalProducts(data.pagination?.total || 0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load products."
      );
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(products.map((product) => product.category))
    );

    return ["All", ...unique];
  }, [products]);

  function updateQuantity(
    product: Product,
    value: number
  ) {
    const safeValue = Math.max(
      0,
      Math.min(Math.floor(value), product.stock)
    );

    setQuantities((current) => {
      const next = { ...current };

      if (safeValue === 0) {
        delete next[product.id];
      } else {
        next[product.id] = safeValue;
      }

      return next;
    });
  }

  const selectedItems = products
    .map((product) => {
      const quantity = quantities[product.id] || 0;

      return {
        product,
        quantity,
      };
    })
    .filter((item) => item.quantity > 0);

  const selectedProductCount = selectedItems.length;

  const totalUnits = selectedItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const estimatedSubtotal = selectedItems.reduce(
    (sum, item) =>
      sum + item.product.sellingPrice * item.quantity,
    0
  );

  function addAllToCart() {
    type StoredCartItem = {
      id: string;
      name: string;
      price: number;
      unit: string;
      image: string | null;
      quantity: number;
    };

    const existing: StoredCartItem[] = JSON.parse(
      localStorage.getItem("officekart-cart") || "[]"
    );

    const cartMap = new Map<string, StoredCartItem>(
      existing.map((item) => [item.id, item])
    );

    selectedItems.forEach((item) => {
      const existingItem = cartMap.get(item.product.id);

      cartMap.set(item.product.id, {
        id: item.product.id,
        name: item.product.name,
        price: item.product.sellingPrice,
        unit: item.product.unit,
        image: item.product.image,
        quantity: (existingItem?.quantity || 0) + item.quantity,
      });
    });

    localStorage.setItem(
      "officekart-cart",
      JSON.stringify(Array.from(cartMap.values()))
    );

    window.location.href = "/cart";
  }
  function clearSelection() {
    setQuantities({});
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Bulk Office Order
          </h1>

          <p className="mt-2 text-slate-600">
            Select quantities for multiple products and
            add everything to one cart.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px]">
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search products..."
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
            />

            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center">
            <p className="text-slate-500">
              Loading products...
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center">
            <p className="font-semibold text-slate-800">
              No products found.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try another search or category.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => {
                const quantity =
                  quantities[product.id] || 0;

                return (
                  <div
                    key={product.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex h-44 items-center justify-center bg-slate-100">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm text-slate-400">
                          No image
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        {product.category}
                      </p>

                      <h2 className="mt-1 min-h-12 font-semibold text-slate-900">
                        {product.name}
                      </h2>

                      {product.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                          {product.description}
                        </p>
                      )}

                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <p className="text-lg font-bold text-slate-900">
                            Rs.{" "}
                            {product.sellingPrice.toFixed(2)}
                          </p>

                          <p className="text-xs text-slate-500">
                            Per {product.unit}
                          </p>
                        </div>

                        <p className="text-xs text-slate-500">
                          Stock: {product.stock}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              product,
                              quantity - 1
                            )
                          }
                          className="h-10 w-10 rounded-lg border border-slate-300 bg-white text-lg font-bold"
                        >
                          -
                        </button>

                        <input
                          type="number"
                          min="0"
                          max={product.stock}
                          value={quantity}
                          onChange={(event) =>
                            updateQuantity(
                              product,
                              Number(event.target.value)
                            )
                          }
                          className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 text-center"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              product,
                              quantity + 1
                            )
                          }
                          className="h-10 w-10 rounded-lg border border-slate-300 bg-white text-lg font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-row">
              <div>
                <p className="font-semibold text-slate-900">
                  {selectedProductCount} products selected
                </p>

                <p className="text-sm text-slate-500">
                  {totalUnits} total units
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  Estimated: Rs.{" "}
                  {estimatedSubtotal.toFixed(2)}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
                >
                  Clear
                </button>

                <button
                  type="button"
                  disabled={selectedProductCount === 0}
                  onClick={addAllToCart}
                  className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add All to Cart
                </button>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() =>
                    setPage((current) => current - 1)
                  }
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) => current + 1)
                  }
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}

            <p className="mt-4 text-center text-xs text-slate-400">
              Showing {products.length} of {totalProducts} available products.
            </p>
          </>
        )}
      </section>
    </main>
  );
}


