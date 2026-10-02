"use client";

import { useState } from "react";

type Product = {
  name: string;
  price: number;
  category: string;
  image: string;
  bulkPrices: {
    min: number;
    max: number | null;
    price: number;
  }[];
};

export default function CategoryPage() {
  const [cartCount, setCartCount] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const products: Product[] = [
    {
      name: "A4 Copier Paper",
      price: 285,
      category: "Paper",
      image: "/products/a4-paper.svg",
      bulkPrices: [
        { min: 1, max: 9, price: 285 },
        { min: 10, max: 49, price: 275 },
        { min: 50, max: 99, price: 265 },
        { min: 100, max: null, price: 255 }
      ]
    },
    {
      name: "Premium Ball Pen",
      price: 5,
      category: "Pens",
      image: "/products/ball-pen.svg",
      bulkPrices: [
        { min: 1, max: 49, price: 5 },
        { min: 50, max: 99, price: 4.5 },
        { min: 100, max: 499, price: 4 },
        { min: 500, max: null, price: 3.5 }
      ]
    },
    {
      name: "Office File",
      price: 18,
      category: "Files",
      image: "/products/office-file.svg",
      bulkPrices: [
        { min: 1, max: 49, price: 18 },
        { min: 50, max: 99, price: 16 },
        { min: 100, max: 499, price: 14 },
        { min: 500, max: null, price: 12 }
      ]
    },
    {
      name: "Executive Notebook",
      price: 65,
      category: "Notebooks",
      image: "/products/notebook.svg",
      bulkPrices: [
        { min: 1, max: 9, price: 65 },
        { min: 10, max: 49, price: 60 },
        { min: 50, max: 99, price: 55 },
        { min: 100, max: null, price: 50 }
      ]
    },
    {
      name: "Permanent Marker",
      price: 25,
      category: "Pens",
      image: "/products/marker.svg",
      bulkPrices: [
        { min: 1, max: 9, price: 25 },
        { min: 10, max: 49, price: 23 },
        { min: 50, max: 99, price: 21 },
        { min: 100, max: null, price: 19 }
      ]
    },
    {
      name: "Document Folder",
      price: 35,
      category: "Files",
      image: "/products/document-folder.svg",
      bulkPrices: [
        { min: 1, max: 9, price: 35 },
        { min: 10, max: 49, price: 32 },
        { min: 50, max: 99, price: 29 },
        { min: 100, max: null, price: 26 }
      ]
    }
  ];

  const getQuantity = (name: string) => {
    return quantities[name] || 1;
  };

  const getPrice = (product: Product, quantity: number) => {
    const tier = product.bulkPrices.find(
      (item) =>
        quantity >= item.min &&
        (item.max === null || quantity <= item.max)
    );

    return tier ? tier.price : product.price;
  };

  const increaseQuantity = (name: string) => {
    setQuantities((previous) => ({
      ...previous,
      [name]: getQuantity(name) + 1
    }));
  };

  const decreaseQuantity = (name: string) => {
    setQuantities((previous) => ({
      ...previous,
      [name]: Math.max(1, getQuantity(name) - 1)
    }));
  };

  const addToCart = (product: Product) => {
    const quantity = getQuantity(product.name);
    const price = getPrice(product, quantity);

    const savedCart = localStorage.getItem("officekart-cart");
    const cart = savedCart ? JSON.parse(savedCart) : [];

    const existingProduct = cart.find(
      (item: { name: string }) => item.name === product.name
    );

    if (existingProduct) {
      existingProduct.quantity += quantity;
      existingProduct.price = getPrice(
        product,
        existingProduct.quantity
      );
    } else {
      cart.push({
        name: product.name,
        price: price,
        image: product.image,
        quantity: quantity
      });
    }

    localStorage.setItem(
      "officekart-cart",
      JSON.stringify(cart)
    );

    const totalItems = cart.reduce(
      (total: number, item: { quantity: number }) =>
        total + item.quantity,
      0
    );

    setCartCount(totalItems);
  };

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
            href="/cart"
            className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white"
          >
            Cart ({cartCount})
          </a>

        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-10">

        <p className="font-semibold uppercase text-blue-700">
          B2B Office Supplies
        </p>

        <h1 className="mt-2 text-4xl font-extrabold">
          Products
        </h1>

        <p className="mt-2 text-slate-500">
          Buy more and automatically unlock better business pricing.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

          {products.map((product) => {
            const quantity = getQuantity(product.name);
            const currentPrice = getPrice(product, quantity);

            return (
              <div
                key={product.name}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm"
              >

                <div className="flex h-52 items-center justify-center bg-slate-100 p-4">

                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-contain"
                  />

                </div>

                <div className="p-6">

                  <p className="text-xs font-semibold uppercase text-blue-600">
                    {product.category}
                  </p>

                  <h2 className="mt-2 text-xl font-bold">
                    {product.name}
                  </h2>

                  <div className="mt-4 rounded-xl bg-blue-50 p-4">

                    <p className="text-sm text-slate-500">
                      Current Business Price
                    </p>

                    <p className="mt-1 text-3xl font-extrabold text-blue-700">
                      Rs. {currentPrice}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      per unit
                    </p>

                  </div>

                  <div className="mt-4">

                    <p className="mb-2 font-bold">
                      Quantity
                    </p>

                    <div className="flex items-center gap-3">

                      <button
                        onClick={() =>
                          decreaseQuantity(product.name)
                        }
                        className="h-10 w-10 rounded-lg border bg-white text-xl font-bold"
                      >
                        -
                      </button>

                      <span className="min-w-12 text-center text-lg font-bold">
                        {quantity}
                      </span>

                      <button
                        onClick={() =>
                          increaseQuantity(product.name)
                        }
                        className="h-10 w-10 rounded-lg border bg-white text-xl font-bold"
                      >
                        +
                      </button>

                    </div>

                  </div>

                  <div className="mt-5 rounded-xl border p-4">

                    <p className="mb-3 font-bold text-slate-800">
                      Bulk Price
                    </p>

                    <div className="space-y-2 text-sm">

                      {product.bulkPrices.map((tier) => (

                        <div
                          key={tier.min}
                          className={
                            "flex justify-between rounded-lg p-2 " +
                            (
                              quantity >= tier.min &&
                              (
                                tier.max === null ||
                                quantity <= tier.max
                              )
                                ? "bg-blue-100 font-bold"
                                : "bg-slate-50"
                            )
                          }
                        >

                          <span>
                            {tier.max
                              ? `${tier.min}-${tier.max}`
                              : `${tier.min}+`}{" "}
                            units
                          </span>

                          <span>
                            Rs. {tier.price}
                          </span>

                        </div>

                      ))}

                    </div>

                  </div>

                  <p className="mt-4 text-right font-bold text-slate-700">
                    Item Total: Rs. {(currentPrice * quantity).toFixed(2)}
                  </p>

                  <button
                    onClick={() => addToCart(product)}
                    className="mt-4 w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800"
                  >
                    Add {quantity} to Cart
                  </button>

                </div>

              </div>
            );
          })}

        </div>

        <div className="mt-12 rounded-3xl bg-slate-900 p-8 text-white">

          <h2 className="text-3xl font-extrabold">
            Need 500+ or 1000+ units?
          </h2>

          <p className="mt-3 text-slate-300">
            Get a customized quotation for large office requirements.
          </p>

          <a href="/quote" className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-bold text-slate-900">Request Bulk Quote</a>

        </div>

      </section>

    </main>
  );
}

