"use client";

import { useState } from "react";

const products = [
  {
    name: "A4 Copier Paper",
    price: 285,
    unit: "1 Ream",
    category: "Paper",
  },
  {
    name: "Premium Ball Pen",
    price: 5,
    unit: "1 Piece",
    category: "Pens",
  },
  {
    name: "Office File",
    price: 18,
    unit: "1 Piece",
    category: "Files",
  },
  {
    name: "Executive Notebook",
    price: 65,
    unit: "1 Piece",
    category: "Notebooks",
  },
  {
    name: "Permanent Marker",
    price: 25,
    unit: "1 Piece",
    category: "Pens",
  },
  {
    name: "Document Folder",
    price: 35,
    unit: "1 Piece",
    category: "Files",
  },
];

export default function CategoryPage() {
  const [cartCount, setCartCount] = useState(0);

  function addToCart() {
    setCartCount((count) => count + 1);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <a
            href="/"
            className="text-2xl font-extrabold text-blue-700"
          >
            OfficeKart
          </a>

          <button className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white">
            🛒 Cart ({cartCount})
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8">
          <p className="font-semibold uppercase text-blue-700">
            Office Supplies
          </p>

          <h1 className="mt-2 text-4xl font-extrabold">
            Products
          </h1>

          <p className="mt-2 text-slate-500">
            Buy office essentials at competitive business prices.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.name}
              className="overflow-hidden rounded-2xl border bg-white shadow-sm"
            >
              <div className="flex h-48 items-center justify-center bg-slate-100 text-7xl">
                📦
              </div>

              <div className="p-6">
                <p className="text-xs font-semibold uppercase text-blue-600">
                  {product.category}
                </p>

                <h2 className="mt-2 text-xl font-bold">
                  {product.name}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {product.unit}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl font-extrabold text-blue-700">
                    ₹{product.price}
                  </span>

                  <button
                    onClick={addToCart}
                    className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800"
                  >
                    Add to Cart
                  </button>
                </div>

                <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm">
                  <p className="font-bold text-blue-800">
                    📦 Bulk Price Available
                  </p>

                  <p className="mt-1 text-slate-600">
                    Buy 50+ units and request a special quotation.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl bg-slate-900 p-8 text-white">
          <h2 className="text-3xl font-extrabold">
            Need a large quantity?
          </h2>

          <p className="mt-3 text-slate-300">
            Send your requirement and get a customized quotation.
          </p>

          <button className="mt-6 rounded-xl bg-white px-6 py-3 font-bold text-slate-900">
            Request Bulk Quote
          </button>
        </div>
      </section>
    </main>
  );
}
