"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CartItem = {
  id: string;
  name: string;
  price: number;
  unit: string;
  image: string | null;
  quantity: number;
};

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");

  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPincode, setShippingPincode] = useState("");

  const [notes, setNotes] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("officekart-cart");

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      }
    } catch {
      setCart([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const subtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [cart]);

  const deliveryCharge = subtotal >= 2000 || subtotal === 0 ? 0 : 80;

  const gstAmount = Number(
    ((subtotal + deliveryCharge) * 0.18).toFixed(2)
  );

  const totalAmount = Number(
    (subtotal + deliveryCharge + gstAmount).toFixed(2)
  );

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (cart.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (!customerName.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    if (!shippingAddress.trim()) {
      setError("Please enter your delivery address.");
      return;
    }

    if (
      !shippingCity.trim() ||
      !shippingState.trim() ||
      !shippingPincode.trim()
    ) {
      setError("Please complete your delivery address.");
      return;
    }

    setPlacingOrder(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName,
          phone,
          email,
          companyName,
          gstin,
          shippingName,
          shippingPhone,
          shippingAddress,
          shippingCity,
          shippingState,
          shippingPincode,
          paymentMethod: "COD",
          notes,
          cart: cart.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to place order."
        );
      }

      localStorage.removeItem("officekart-cart");

      window.location.href =
        "/order-success?orderNumber=" +
        encodeURIComponent(data.order.orderNumber);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to place order."
      );
      setPlacingOrder(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-slate-600">Loading checkout...</p>
        </div>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">
            Your cart is empty
          </h1>

          <p className="mt-3 text-slate-600">
            Add products before proceeding to checkout.
          </p>

          <Link
            href="/bulk-order"
            className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white"
          >
            Browse Products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/cart"
            className="text-sm font-medium text-blue-600"
          >
            Back to Cart
          </Link>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Checkout
          </h1>

          <p className="mt-2 text-slate-600">
            Complete your details to place the OfficeKart order.
          </p>
        </div>

        <form
          onSubmit={placeOrder}
          className="grid gap-6 lg:grid-cols-[1fr_360px]"
        >
          <section className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Customer Details
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name *"
                  className="rounded-xl border p-3"
                />

                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number *"
                  className="rounded-xl border p-3"
                />

                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  className="rounded-xl border p-3"
                />

                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company name"
                  className="rounded-xl border p-3"
                />

                <input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="GSTIN"
                  className="rounded-xl border p-3 md:col-span-2"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Delivery Address
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <input
                  value={shippingName}
                  onChange={(e) => setShippingName(e.target.value)}
                  placeholder="Receiver name"
                  className="rounded-xl border p-3"
                />

                <input
                  value={shippingPhone}
                  onChange={(e) => setShippingPhone(e.target.value)}
                  placeholder="Receiver phone"
                  className="rounded-xl border p-3"
                />

                <textarea
                  value={shippingAddress}
                  onChange={(e) =>
                    setShippingAddress(e.target.value)
                  }
                  placeholder="Full delivery address *"
                  rows={4}
                  className="rounded-xl border p-3 md:col-span-2"
                />

                <input
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                  placeholder="City *"
                  className="rounded-xl border p-3"
                />

                <input
                  value={shippingState}
                  onChange={(e) => setShippingState(e.target.value)}
                  placeholder="State *"
                  className="rounded-xl border p-3"
                />

                <input
                  value={shippingPincode}
                  onChange={(e) =>
                    setShippingPincode(e.target.value)
                  }
                  placeholder="PIN code *"
                  inputMode="numeric"
                  className="rounded-xl border p-3"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Payment
              </h2>

              <div className="mt-4 rounded-xl border p-4">
                <p className="font-semibold text-slate-900">
                  Cash on Delivery
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Online payment will be added in a later phase.
                </p>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Order notes (optional)"
                rows={3}
                className="mt-4 w-full rounded-xl border p-3"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-xl font-bold text-slate-900">
              Order Summary
            </h2>

            <div className="mt-5 space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-4 border-b pb-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {item.name}
                    </p>

                    <p className="text-sm text-slate-500">
                      {item.quantity} {item.unit}
                    </p>
                  </div>

                  <p className="font-semibold">
                    Rs.{" "}
                    {(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rs. {subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span>Delivery</span>
                <span>
                  {deliveryCharge === 0
                    ? "FREE"
                    : `Rs. ${deliveryCharge.toFixed(2)}`}
                </span>
              </div>

              <div className="flex justify-between">
                <span>GST</span>
                <span>Rs. {gstAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between border-t pt-4 text-lg font-bold">
                <span>Total</span>
                <span>Rs. {totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={placingOrder}
              className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {placingOrder
                ? "Placing Order..."
                : "Place Order"}
            </button>
          </aside>
        </form>
      </div>
    </main>
  );
}
