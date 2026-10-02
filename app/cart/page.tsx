"use client";

import { useEffect, useState } from "react";

type CartItem = {
  name: string;
  price: number;
  image: string;
  quantity: number;
};

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem("officekart-cart");

    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem("officekart-cart", JSON.stringify(newCart));
  };

  const increaseQuantity = (name: string) => {
    const newCart = cart.map((item) =>
      item.name === name
        ? { ...item, quantity: item.quantity + 1 }
        : item
    );

    saveCart(newCart);
  };

  const decreaseQuantity = (name: string) => {
    const newCart = cart
      .map((item) =>
        item.name === name
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
      .filter((item) => item.quantity > 0);

    saveCart(newCart);
  };

  const removeItem = (name: string) => {
    const newCart = cart.filter((item) => item.name !== name);
    saveCart(newCart);
  };

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const delivery = subtotal >= 2000 || subtotal === 0 ? 0 : 80;

  const gst = Math.round(subtotal * 0.18);

  const total = subtotal + delivery + gst;

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

          <a
            href="/products/paper"
            className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white"
          >
            Continue Shopping
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-4xl font-extrabold text-slate-900">
          Shopping Cart
        </h1>

        {cart.length === 0 ? (
          <div className="mt-10 rounded-3xl border bg-white p-12 text-center">
            <div className="text-7xl">??</div>

            <h2 className="mt-5 text-2xl font-bold">
              Your cart is empty
            </h2>

            <p className="mt-2 text-slate-500">
              Add office products to your cart to continue.
            </p>

            <a
              href="/products/paper"
              className="mt-6 inline-block rounded-xl bg-blue-700 px-6 py-3 font-bold text-white"
            >
              Browse Products
            </a>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {cart.map((item) => (
                <div
                  key={item.name}
                  className="flex flex-col gap-5 rounded-2xl border bg-white p-5 sm:flex-row sm:items-center"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-28 w-28 rounded-xl bg-slate-100 object-contain p-2"
                  />

                  <div className="flex-1">
                    <h2 className="text-xl font-bold">
                      {item.name}
                    </h2>

                    <p className="mt-1 text-lg font-bold text-blue-700">
                      ?{item.price}
                    </p>

                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={() => decreaseQuantity(item.name)}
                        className="h-9 w-9 rounded-lg border bg-white text-lg font-bold"
                      >
                        -
                      </button>

                      <span className="min-w-8 text-center font-bold">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => increaseQuantity(item.name)}
                        className="h-9 w-9 rounded-lg border bg-white text-lg font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xl font-extrabold">
                      ?{item.price * item.quantity}
                    </p>

                    <button
                      onClick={() => removeItem(item.name)}
                      className="mt-3 text-sm font-semibold text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="h-fit rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-extrabold">
                Order Summary
              </h2>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold">?{subtotal}</span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className="font-bold">
                    {delivery === 0 ? "FREE" : `₹${delivery}`}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>GST (18%)</span>
                  <span className="font-bold">?{gst}</span>
                </div>
              </div>

              <div className="my-6 border-t" />

              <div className="flex justify-between text-xl">
                <span className="font-bold">Total</span>

                <span className="font-extrabold text-blue-700">
                  ?{total}
                </span>
              </div>

              <button className="mt-6 w-full rounded-xl bg-blue-700 px-5 py-4 font-bold text-white">
                Proceed to Checkout
              </button>

              <button className="mt-3 w-full rounded-xl border border-slate-300 px-5 py-4 font-bold text-slate-700">
                Request Bulk Quote
              </button>

              {subtotal < 2000 && subtotal > 0 && (
                <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
                  Add ?{2000 - subtotal} more to get FREE delivery.
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
