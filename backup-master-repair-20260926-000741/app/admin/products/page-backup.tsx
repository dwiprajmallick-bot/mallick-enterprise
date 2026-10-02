"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  unit: string;
  stock: number;
  image: string;
  description: string;
  active: boolean;
};

const STORAGE_KEY = "officekart-products";

const categories = [
  "Paper",
  "Pens and Writing",
  "Markers",
  "Files and Folders",
  "Notebooks and Registers",
  "Staplers and Punches",
  "Clips and Desk Supplies",
  "Calculators",
  "Envelopes",
  "Printer Ink and Toner",
  "Computer Accessories",
  "Cleaning Supplies",
  "Pantry Supplies",
  "Packaging Materials",
  "Printing and Custom Stationery",
  "Corporate Gifts",
  "Office Furniture",
  "Electrical and Office Equipment",
  "Safety and Security",
  "Other",
];

const units = [
  "piece",
  "box",
  "pack",
  "ream",
  "carton",
  "set",
  "kg",
  "litre",
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Paper");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [unit, setUnit] = useState("piece");
  const [stock, setStock] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const oldProducts = JSON.parse(saved);

        const convertedProducts: Product[] = oldProducts.map(
          (item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            purchasePrice: Number(
              item.purchasePrice ?? item.price ?? 0
            ),
            sellingPrice: Number(
              item.sellingPrice ?? item.price ?? 0
            ),
            unit: item.unit || "piece",
            stock: Number(item.stock ?? 0),
            image: item.image || "",
            description: item.description || "",
            active:
              typeof item.active === "boolean"
                ? item.active
                : true,
          })
        );

        setProducts(convertedProducts);
      }
    } catch {
      setProducts([]);
    }
  }, []);

  function saveProducts(newProducts: Product[]) {
    setProducts(newProducts);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(newProducts)
    );
  }

  function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Image size must be less than 2 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImage(reader.result as string);
      setMessage("Image selected successfully.");
    };

    reader.readAsDataURL(file);
  }

  function resetForm() {
    setName("");
    setCategory("Paper");
    setPurchasePrice("");
    setSellingPrice("");
    setUnit("piece");
    setStock("");
    setImage("");
    setDescription("");
    setEditingId(null);
    setMessage("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const purchase = Number(purchasePrice);
    const selling = Number(sellingPrice);
    const stockQuantity = Number(stock);

    if (!name.trim()) {
      setMessage("Please enter product name.");
      return;
    }

    if (!purchasePrice || purchase <= 0) {
      setMessage("Please enter a valid purchase price.");
      return;
    }

    if (!sellingPrice || selling <= 0) {
      setMessage("Please enter a valid selling price.");
      return;
    }

    if (selling < purchase) {
      setMessage(
        "Selling price cannot be lower than purchase price."
      );
      return;
    }

    if (stock === "" || stockQuantity < 0) {
      setMessage("Please enter a valid stock quantity.");
      return;
    }

    if (!image) {
      setMessage("Please upload a product image.");
      return;
    }

    const product: Product = {
      id: editingId || Date.now().toString(),
      name: name.trim(),
      category,
      purchasePrice: purchase,
      sellingPrice: selling,
      unit,
      stock: stockQuantity,
      image,
      description: description.trim(),
      active: editingId
        ? products.find((item) => item.id === editingId)?.active ??
          true
        : true,
    };

    let updatedProducts: Product[];

    if (editingId) {
      updatedProducts = products.map((item) =>
        item.id === editingId ? product : item
      );

      setMessage("Product updated successfully.");
    } else {
      updatedProducts = [product, ...products];

      setMessage("Product added successfully.");
    }

    saveProducts(updatedProducts);

    setName("");
    setCategory("Paper");
    setPurchasePrice("");
    setSellingPrice("");
    setUnit("piece");
    setStock("");
    setImage("");
    setDescription("");
    setEditingId(null);
  }

  function editProduct(product: Product) {
    setEditingId(product.id);
    setName(product.name);
    setCategory(product.category);
    setPurchasePrice(String(product.purchasePrice));
    setSellingPrice(String(product.sellingPrice));
    setUnit(product.unit);
    setStock(String(product.stock));
    setImage(product.image);
    setDescription(product.description);
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function toggleProduct(id: string) {
    const updated = products.map((product) =>
      product.id === id
        ? {
            ...product,
            active: !product.active,
          }
        : product
    );

    saveProducts(updated);
  }

  function deleteProduct(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this product?"
    );

    if (!confirmed) return;

    const updated = products.filter(
      (product) => product.id !== id
    );

    saveProducts(updated);

    setMessage("Product deleted.");
  }

  const totalPurchaseValue = products.reduce(
    (sum, product) =>
      sum +
      Number(product.purchasePrice) *
        Number(product.stock),
    0
  );

  const totalSalesValue = products.reduce(
    (sum, product) =>
      sum +
      Number(product.sellingPrice) *
        Number(product.stock),
    0
  );

  const totalExpectedProfit =
    totalSalesValue - totalPurchaseValue;

  const totalProfitPercent =
    totalSalesValue > 0
      ? (totalExpectedProfit / totalSalesValue) * 100
      : 0;

  const activeProducts = products.filter(
    (product) => product.active
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">
            OfficeKart Product Manager
          </h1>

          <p className="mt-2 text-slate-600">
            Manage products, stock, selling price and profit.
            Financial information is for admin only.
          </p>
        </div>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Total Products
            </p>
            <p className="mt-2 text-3xl font-extrabold">
              {products.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Active Products
            </p>
            <p className="mt-2 text-3xl font-extrabold text-green-600">
              {activeProducts}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Stock Purchase Value
            </p>
            <p className="mt-2 text-2xl font-extrabold">
              Rs. {totalPurchaseValue.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Expected Profit
            </p>
            <p className="mt-2 text-2xl font-extrabold text-green-600">
              Rs. {totalExpectedProfit.toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Margin: {totalProfitPercent.toFixed(2)}%
            </p>
          </div>

        </section>

        {message && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 font-semibold text-blue-800">
            {message}
          </div>
        )}

        <section className="mb-10 rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">
              {editingId
                ? "Edit Product"
                : "Add New Product"}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border px-4 py-2 text-sm font-semibold"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-6 md:grid-cols-2"
          >

            <div>
              <label className="mb-2 block font-semibold">
                Product Name
              </label>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Example: A4 Copier Paper"
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Category
              </label>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Purchase Price
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={purchasePrice}
                onChange={(e) =>
                  setPurchasePrice(e.target.value)
                }
                placeholder="Example: 220"
                className="w-full rounded-xl border px-4 py-3"
              />

              <p className="mt-1 text-xs text-slate-500">
                Your buying price per unit.
              </p>
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Selling Price
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={sellingPrice}
                onChange={(e) =>
                  setSellingPrice(e.target.value)
                }
                placeholder="Example: 250"
                className="w-full rounded-xl border px-4 py-3"
              />

              <p className="mt-1 text-xs text-slate-500">
                Customer-facing price per unit.
              </p>
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Unit
              </label>

              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              >
                {units.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Stock Quantity
              </label>

              <input
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Example: 100"
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block font-semibold">
                Product Image
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full rounded-xl border bg-white px-4 py-3"
              />

              <p className="mt-2 text-sm text-slate-500">
                JPG, PNG or WEBP. Maximum 2 MB.
              </p>

              {image && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold">
                    Image Preview
                  </p>

                  <img
                    src={image}
                    alt="Product preview"
                    className="h-40 w-40 rounded-xl border object-cover"
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block font-semibold">
                Product Description
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                rows={5}
                placeholder="Write product details, quality, size, brand and features."
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {purchasePrice &&
              sellingPrice &&
              Number(sellingPrice) >=
                Number(purchasePrice) && (
                <div className="md:col-span-2 rounded-xl bg-green-50 p-4">

                  <p className="font-bold text-green-800">
                    Profit Preview
                  </p>

                  <p className="mt-2 text-green-700">
                    Profit per unit: Rs.{" "}
                    {(
                      Number(sellingPrice) -
                      Number(purchasePrice)
                    ).toFixed(2)}
                  </p>

                  <p className="text-green-700">
                    Profit percentage:{" "}
                    {Number(purchasePrice) > 0
                      ? (
                          ((Number(sellingPrice) -
                            Number(purchasePrice)) /
                            Number(purchasePrice)) *
                          100
                        ).toFixed(2)
                      : "0.00"}
                    %
                  </p>

                  <p className="text-green-700">
                    Current stock purchase value: Rs.{" "}
                    {(
                      Number(purchasePrice) *
                      Number(stock || 0)
                    ).toFixed(2)}
                  </p>

                  <p className="text-green-700">
                    Current stock sales value: Rs.{" "}
                    {(
                      Number(sellingPrice) *
                      Number(stock || 0)
                    ).toFixed(2)}
                  </p>

                  <p className="font-bold text-green-800">
                    Current stock potential profit: Rs.{" "}
                    {(
                      (Number(sellingPrice) -
                        Number(purchasePrice)) *
                      Number(stock || 0)
                    ).toFixed(2)}
                  </p>

                </div>
              )}

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-7 py-3 font-bold text-white hover:bg-blue-700"
              >
                {editingId
                  ? "Update Product"
                  : "Save Product"}
              </button>
            </div>

          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Product List
            </h2>

            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold">
              {products.length} Products
            </span>
          </div>

          {products.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">
              No products added yet.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

              {products.map((product) => {

                const profitPerUnit =
                  product.sellingPrice -
                  product.purchasePrice;

                const profitPercent =
                  product.purchasePrice > 0
                    ? (profitPerUnit /
                        product.purchasePrice) *
                      100
                    : 0;

                const purchaseValue =
                  product.purchasePrice *
                  product.stock;

                const salesValue =
                  product.sellingPrice *
                  product.stock;

                const stockProfit =
                  salesValue - purchaseValue;

                return (
                  <div
                    key={product.id}
                    className={`overflow-hidden rounded-2xl border ${
                      product.active
                        ? "bg-white"
                        : "bg-slate-100 opacity-70"
                    }`}
                  >

                    <div className="aspect-square bg-slate-100">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="p-5">

                      <div className="mb-2 flex items-start justify-between gap-3">

                        <h3 className="font-bold text-slate-900">
                          {product.name}
                        </h3>

                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold ${
                            product.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {product.active
                            ? "Active"
                            : "Hidden"}
                        </span>

                      </div>

                      <p className="mb-2 text-sm text-blue-600">
                        {product.category}
                      </p>

                      <p className="mb-3 text-sm text-slate-600">
                        {product.description ||
                          "No description added."}
                      </p>

                      <div className="space-y-2 rounded-xl bg-slate-50 p-4">

                        <p className="font-bold">
                          Selling Price: Rs.{" "}
                          {product.sellingPrice.toFixed(2)} /{" "}
                          {product.unit}
                        </p>

                        <p className="text-sm text-slate-600">
                          Purchase Price: Rs.{" "}
                          {product.purchasePrice.toFixed(2)}
                        </p>

                        <p className="text-sm font-semibold text-green-700">
                          Profit / Unit: Rs.{" "}
                          {profitPerUnit.toFixed(2)}
                        </p>

                        <p className="text-sm font-semibold text-green-700">
                          Profit %:{" "}
                          {profitPercent.toFixed(2)}%
                        </p>

                        <p className="text-sm text-slate-600">
                          Stock: {product.stock}{" "}
                          {product.unit}
                        </p>

                        <p className="text-sm text-slate-600">
                          Stock Purchase Value: Rs.{" "}
                          {purchaseValue.toFixed(2)}
                        </p>

                        <p className="text-sm text-slate-600">
                          Stock Sales Value: Rs.{" "}
                          {salesValue.toFixed(2)}
                        </p>

                        <p className="font-bold text-green-700">
                          Stock Potential Profit: Rs.{" "}
                          {stockProfit.toFixed(2)}
                        </p>

                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            editProduct(product)
                          }
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleProduct(product.id)
                          }
                          className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold"
                        >
                          {product.active
                            ? "Hide"
                            : "Show"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteProduct(product.id)
                          }
                          className="rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700"
                        >
                          Delete
                        </button>

                      </div>

                    </div>
                  </div>
                );
              })}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}
