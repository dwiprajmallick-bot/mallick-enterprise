"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  companyName?: string | null;
  gstin?: string | null;
};

type Product = {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  unit: string;
  stock: number;
  active: boolean;
};

type OrderItem = {
  productId: string;
  quantity: number;
};

export default function NewOrderPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<OrderItem[]>([
    { productId: "", quantity: 1 },
  ]);

  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPincode, setShippingPincode] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [deliveryCharge, setDeliveryCharge] = useState("0");
  const [gstAmount, setGstAmount] = useState("0");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [customersRes, productsRes] = await Promise.all([
          fetch("/api/admin/customers", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/admin/products", {
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        if (!customersRes.ok) {
          throw new Error("Failed to load customers");
        }

        if (!productsRes.ok) {
          throw new Error("Failed to load products");
        }

        const customersData = await customersRes.json();
        const productsData = await productsRes.json();

        const customerList: Customer[] = Array.isArray(customersData)
          ? customersData
          : Array.isArray(customersData.customers)
            ? customersData.customers
            : [];

        const productList: Product[] = Array.isArray(productsData)
          ? productsData
          : Array.isArray(productsData.data)
            ? productsData.data
            : Array.isArray(productsData.products)
              ? productsData.products
              : [];

        setCustomers(customerList);
        setProducts(
          productList.filter((product) => product.active !== false)
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load data"
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function handleCustomerChange(value: string) {
    setCustomerId(value);

    const customer = customers.find((item) => item.id === value);

    if (customer) {
      setShippingName(customer.name || "");
      setShippingPhone(customer.phone || "");
    } else {
      setShippingName("");
      setShippingPhone("");
    }
  }

  function updateItem(
    index: number,
    field: "productId" | "quantity",
    value: string
  ) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        if (field === "productId") {
          return {
            ...item,
            productId: value,
          };
        }

        const quantity = Math.max(1, Number(value) || 1);

        return {
          ...item,
          quantity,
        };
      })
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        productId: "",
        quantity: 1,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((current) => {
      if (current.length === 1) {
        return [{ productId: "", quantity: 1 }];
      }

      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  const subtotal = useMemo(() => {
    return items.reduce((total, item) => {
      const product = products.find(
        (productItem) => productItem.id === item.productId
      );

      if (!product) return total;

      return total + product.sellingPrice * item.quantity;
    }, 0);
  }, [items, products]);

  const grandTotal =
    subtotal +
    Math.max(0, Number(deliveryCharge) || 0) +
    Math.max(0, Number(gstAmount) || 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    const validItems = items.filter(
      (item) => item.productId && item.quantity > 0
    );

    if (validItems.length === 0) {
      setError("Please add at least one product.");
      return;
    }

    for (const item of validItems) {
      const product = products.find(
        (productItem) => productItem.id === item.productId
      );

      if (!product) {
        setError("One or more selected products are invalid.");
        return;
      }

      if (item.quantity > product.stock) {
        setError(
          `${product.name}: only ${product.stock} ${product.unit} available in stock.`
        );
        return;
      }
    }

    try {
      setSaving(true);

      const response = await fetch("/api/admin/orders", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId,
          items: validItems,
          shippingName,
          shippingPhone,
          shippingAddress,
          shippingCity,
          shippingState,
          shippingPincode,
          paymentMethod,
          deliveryCharge: Number(deliveryCharge) || 0,
          gstAmount: Number(gstAmount) || 0,
          notes: notes.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Failed to create order."
        );
      }

      router.push("/admin/orders");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create order."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">
              New Order
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create a new customer order and automatically reduce stock.
            </p>
          </div>

          
        </div>

        {loading && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-700">
            Loading customers and products...
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {!loading && customers.length === 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
            No customers found. Please create a customer first.
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
            No active products found. Please create a product first.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-extrabold text-slate-900">
              Customer
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Customer
                </label>

                <select
                  value={customerId}
                  onChange={(event) =>
                    handleCustomerChange(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  required
                >
                  <option value="">Select customer</option>

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Customers available
                </label>

                <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                  {customers.length}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Products
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select products and quantities.
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
              >
                + Add Product
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => {
                const product = products.find(
                  (productItem) => productItem.id === item.productId
                );

                return (
                  <div
                    key={`${index}-${item.productId}`}
                    className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_160px_120px_auto]"
                  >
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
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
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                        required
                      >
                        <option value="">Select product</option>

                        {products.map((productItem) => (
                          <option
                            key={productItem.id}
                            value={productItem.id}
                          >
                            {productItem.name} — ₹
                            {productItem.sellingPrice.toFixed(2)} /{" "}
                            {productItem.unit} — Stock: {productItem.stock}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Quantity
                      </label>

                      <input
                        type="number"
                        min="1"
                        max={product?.stock || undefined}
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "quantity",
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Amount
                      </label>

                      <div className="rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-800">
                        ₹
                        {product
                          ? (
                              product.sellingPrice * item.quantity
                            ).toFixed(2)
                          : "0.00"}
                      </div>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-extrabold text-slate-900">
              Shipping Details
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Name
                </label>

                <input
                  value={shippingName}
                  onChange={(event) =>
                    setShippingName(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Phone
                </label>

                <input
                  value={shippingPhone}
                  onChange={(event) =>
                    setShippingPhone(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Address
                </label>

                <textarea
                  value={shippingAddress}
                  onChange={(event) =>
                    setShippingAddress(event.target.value)
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  City
                </label>

                <input
                  value={shippingCity}
                  onChange={(event) =>
                    setShippingCity(event.target.value)
                  }
                  placeholder="City"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  State
                </label>

                <input
                  value={shippingState}
                  onChange={(event) =>
                    setShippingState(event.target.value)
                  }
                  placeholder="State"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Pincode
                </label>

                <input
                  value={shippingPincode}
                  onChange={(event) =>
                    setShippingPincode(event.target.value)
                  }
                  placeholder="Pincode"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  required
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-extrabold text-slate-900">
              Payment & Charges
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Payment Method
                </label>

                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="COD">Cash on Delivery</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Delivery Charge
                </label>

                <input
                  type="number"
                  min="0"
                  value={deliveryCharge}
                  onChange={(event) =>
                    setDeliveryCharge(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  GST Amount
                </label>

                <input
                  type="number"
                  min="0"
                  value={gstAmount}
                  onChange={(event) =>
                    setGstAmount(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>
            </div>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Order notes (optional)"
              rows={3}
              className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </section>

          <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
            <div className="ml-auto max-w-md space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span>Delivery</span>
                <span>
                  ₹{(Number(deliveryCharge) || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>GST</span>
                <span>
                  ₹{(Number(gstAmount) || 0).toFixed(2)}
                </span>
              </div>

              <div className="border-t border-slate-700 pt-3 text-xl font-extrabold">
                <div className="flex justify-between">
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  saving ||
                  loading ||
                  customers.length === 0 ||
                  products.length === 0
                }
                className="mt-4 w-full rounded-xl bg-white px-5 py-3 font-extrabold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Creating Order..." : "Create Order"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
