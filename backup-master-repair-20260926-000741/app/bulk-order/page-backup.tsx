"use client";

import { useMemo, useState } from "react";

type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  unit: string;
};

const productGroups: Record<string, string[]> = {
  "Paper": [
    "A4 Copier Paper",
    "A3 Copier Paper",
    "Legal Size Paper",
    "Executive Bond Paper",
    "Photo Paper",
    "Colour Paper",
    "Art Paper",
    "Glossy Paper",
    "Card Paper",
    "Certificate Paper"
  ],

  "Pens and Writing": [
    "Blue Ball Pen",
    "Black Ball Pen",
    "Red Ball Pen",
    "Gel Pen",
    "Premium Ball Pen",
    "Roller Ball Pen",
    "Fountain Pen",
    "Pencil HB",
    "Mechanical Pencil",
    "Eraser",
    "Sharpener",
    "Correction Pen",
    "Correction Tape"
  ],

  "Markers": [
    "Permanent Marker",
    "Whiteboard Marker",
    "Highlighter Yellow",
    "Highlighter Green",
    "Highlighter Pink",
    "Highlighter Blue",
    "CD Marker",
    "Flipchart Marker",
    "Paint Marker",
    "Calligraphy Marker"
  ],

  "Files and Folders": [
    "Office File",
    "Plastic File",
    "Box File",
    "Lever Arch File",
    "Document Folder",
    "Display File",
    "L Folder",
    "Button Folder",
    "Ring Binder",
    "Conference Folder",
    "Expanding File",
    "Zip Folder"
  ],

  "Notebooks and Registers": [
    "Executive Notebook",
    "Office Register",
    "Long Notebook",
    "Short Notebook",
    "Meeting Notebook",
    "Spiral Notebook",
    "Hardbound Notebook",
    "Project Register",
    "Attendance Register",
    "Cash Book",
    "Stock Register",
    "Visitor Register"
  ],

  "Staplers and Punches": [
    "Stapler Small",
    "Stapler Medium",
    "Stapler Large",
    "Stapler Pin No 10",
    "Stapler Pin 24/6",
    "Stapler Pin 24/8",
    "Stapler Remover",
    "Paper Punch",
    "Heavy Duty Punch",
    "Two Hole Punch",
    "Four Hole Punch"
  ],

  "Clips and Desk Supplies": [
    "Paper Clip Small",
    "Paper Clip Large",
    "Binder Clip Small",
    "Binder Clip Medium",
    "Binder Clip Large",
    "Rubber Band",
    "Thumb Pin",
    "Drawing Pin",
    "Push Pin",
    "Paper Fastener",
    "Document Clip",
    "Desk Organizer"
  ],

  "Calculators": [
    "Basic Calculator",
    "Desktop Calculator",
    "Scientific Calculator",
    "Printing Calculator",
    "Large Desktop Calculator",
    "Financial Calculator"
  ],

  "Envelopes": [
    "Small Office Envelope",
    "Large Office Envelope",
    "Document Envelope",
    "Courier Envelope",
    "Bubble Envelope",
    "Money Envelope",
    "Window Envelope",
    "Certificate Envelope",
    "Printed Envelope"
  ],

  "Printer Ink and Toner": [
    "Printer Ink Black",
    "Printer Ink Colour",
    "Laser Toner Black",
    "Laser Toner Colour",
    "Ink Cartridge",
    "Compatible Ink Cartridge",
    "Compatible Toner",
    "Original Toner",
    "Ribbon Cartridge",
    "Printer Drum"
  ],

  "Computer Accessories": [
    "USB Keyboard",
    "USB Mouse",
    "Wireless Mouse",
    "Keyboard and Mouse Combo",
    "USB Hub",
    "HDMI Cable",
    "LAN Cable",
    "USB Cable",
    "Webcam",
    "Laptop Stand",
    "Mouse Pad",
    "Pen Drive",
    "Memory Card",
    "Card Reader",
    "Laptop Bag",
    "Power Extension Board",
    "UPS"
  ],

  "Cleaning Supplies": [
    "Hand Wash",
    "Floor Cleaner",
    "Glass Cleaner",
    "Toilet Cleaner",
    "Disinfectant",
    "Garbage Bag Small",
    "Garbage Bag Medium",
    "Garbage Bag Large",
    "Dustbin Small",
    "Dustbin Medium",
    "Dustbin Large",
    "Cleaning Gloves",
    "Floor Mop",
    "Broom",
    "Dustpan",
    "Microfiber Cloth",
    "Air Freshener"
  ],

  "Pantry Supplies": [
    "Paper Cup",
    "Paper Plate",
    "Tissue Paper",
    "Tea Cup",
    "Water Bottle",
    "Coffee Powder",
    "Tea",
    "Sugar",
    "Milk Powder",
    "Disposable Spoon",
    "Disposable Glass",
    "Kitchen Tissue"
  ],

  "Packaging Materials": [
    "Packing Tape",
    "Brown Tape",
    "Transparent Tape",
    "Bubble Wrap",
    "Packaging Box Small",
    "Packaging Box Medium",
    "Packaging Box Large",
    "Courier Bag",
    "Zip Lock Bag",
    "Stretch Film",
    "Packing Rope",
    "Packaging Label"
  ],

  "Printing and Custom Stationery": [
    "Visiting Card Printing",
    "Letterhead Printing",
    "Envelope Printing",
    "ID Card Printing",
    "Office Stamp",
    "Rubber Stamp",
    "Receipt Book Printing",
    "Invoice Book Printing",
    "Company Diary Printing",
    "Company Calendar Printing",
    "Custom Notebook Printing",
    "Custom Folder Printing"
  ],

  "Corporate Gifts": [
    "Corporate Gift Pen",
    "Corporate Diary",
    "Corporate Mug",
    "Corporate Key Ring",
    "Corporate Gift Set",
    "Corporate Bottle",
    "Corporate Backpack",
    "Corporate Notebook",
    "Corporate Calendar",
    "Corporate Desk Set"
  ],

  "Office Furniture": [
    "Office Chair",
    "Executive Chair",
    "Visitor Chair",
    "Office Table",
    "Executive Table",
    "Computer Table",
    "Conference Table",
    "Filing Cabinet",
    "Office Cupboard",
    "Storage Rack"
  ],

  "Electrical and Office Equipment": [
    "LED Bulb",
    "LED Tube Light",
    "Extension Board",
    "Multi Plug",
    "Power Strip",
    "Emergency Light",
    "Table Fan",
    "Ceiling Fan",
    "Electric Kettle",
    "Room Heater"
  ],

  "Safety and Security": [
    "First Aid Box",
    "Safety Helmet",
    "Safety Gloves",
    "Safety Shoes",
    "Reflective Jacket",
    "Warning Sign",
    "Caution Board",
    "Fire Safety Sign",
    "Visitor Badge",
    "ID Card Holder"
  ]
};

const basePrices: Record<string, number> = {
  "A4 Copier Paper": 285,
  "A3 Copier Paper": 420,
  "Blue Ball Pen": 5,
  "Black Ball Pen": 5,
  "Red Ball Pen": 5,
  "Gel Pen": 10,
  "Premium Ball Pen": 25,
  "Permanent Marker": 25,
  "Whiteboard Marker": 22,
  "Office File": 18,
  "Plastic File": 22,
  "Box File": 65,
  "Lever Arch File": 95,
  "Document Folder": 35,
  "Executive Notebook": 65,
  "Office Register": 80,
  "Long Notebook": 55,
  "Short Notebook": 45,
  "Meeting Notebook": 75,
  "Stapler Small": 45,
  "Stapler Medium": 70,
  "Stapler Large": 120,
  "Stapler Pin No 10": 15,
  "Stapler Pin 24/6": 18,
  "Paper Punch": 75,
  "Paper Clip Small": 20,
  "Paper Clip Large": 30,
  "Binder Clip Small": 25,
  "Binder Clip Medium": 30,
  "Binder Clip Large": 40,
  "Basic Calculator": 150,
  "Desktop Calculator": 280,
  "Scientific Calculator": 450,
  "Small Office Envelope": 2,
  "Large Office Envelope": 4,
  "Document Envelope": 8,
  "Courier Envelope": 6,
  "Printer Ink Black": 650,
  "Printer Ink Colour": 850,
  "Laser Toner Black": 1800,
  "Laser Toner Colour": 3200,
  "Ink Cartridge": 750,
  "USB Keyboard": 450,
  "USB Mouse": 300,
  "Wireless Mouse": 550,
  "Keyboard and Mouse Combo": 750,
  "USB Hub": 350,
  "HDMI Cable": 250,
  "LAN Cable": 180,
  "USB Cable": 120,
  "Webcam": 850,
  "Laptop Stand": 650,
  "Mouse Pad": 100,
  "Pen Drive": 450,
  "Hand Wash": 120,
  "Floor Cleaner": 150,
  "Glass Cleaner": 130,
  "Toilet Cleaner": 120,
  "Disinfectant": 180,
  "Garbage Bag Small": 80,
  "Garbage Bag Medium": 110,
  "Garbage Bag Large": 150,
  "Dustbin Small": 180,
  "Dustbin Medium": 300,
  "Dustbin Large": 450,
  "Cleaning Gloves": 60,
  "Floor Mop": 180,
  "Broom": 100,
  "Dustpan": 80,
  "Microfiber Cloth": 40,
  "Air Freshener": 120,
  "Paper Cup": 1.5,
  "Paper Plate": 3,
  "Tissue Paper": 80,
  "Tea Cup": 35,
  "Water Bottle": 25,
  "Packing Tape": 45,
  "Brown Tape": 40,
  "Transparent Tape": 40,
  "Bubble Wrap": 180,
  "Packaging Box Small": 20,
  "Packaging Box Medium": 35,
  "Packaging Box Large": 50,
  "Visiting Card Printing": 250,
  "Letterhead Printing": 350,
  "Envelope Printing": 500,
  "ID Card Printing": 50,
  "Office Stamp": 250,
  "Rubber Stamp": 250,
  "Corporate Gift Pen": 50,
  "Corporate Diary": 180,
  "Corporate Mug": 150,
  "Corporate Key Ring": 60,
  "Corporate Gift Set": 350,
  "Office Chair": 3500,
  "Executive Chair": 6500,
  "Visitor Chair": 1800,
  "Office Table": 5500,
  "Executive Table": 8500,
  "Computer Table": 4500,
  "Filing Cabinet": 7500,
  "Office Cupboard": 9000,
  "Storage Rack": 4500,
  "LED Bulb": 120,
  "LED Tube Light": 180,
  "Extension Board": 350,
  "Multi Plug": 180,
  "Power Strip": 450,
  "Emergency Light": 650,
  "Table Fan": 1500,
  "Electric Kettle": 900,
  "First Aid Box": 450,
  "Safety Helmet": 350,
  "Safety Gloves": 80,
  "Safety Shoes": 650,
  "Reflective Jacket": 250,
  "Warning Sign": 150
};

const products: Product[] = Object.entries(productGroups).flatMap(
  ([category, names]) =>
    names.map((name, index) => ({
      id:
        Object.keys(productGroups)
          .slice(0, Object.keys(productGroups).indexOf(category))
          .reduce(
            (total, key) => total + productGroups[key].length,
            0
          ) +
        index +
        1,
      name,
      category,
      price: basePrices[name] || 100,
      unit: "piece"
    }))
);

export default function BulkOrderPage() {
  const [quantities, setQuantities] =
    useState<Record<number, number>>({});

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [message, setMessage] = useState("");

  const categories = ["All", ...Object.keys(productGroups)];

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchMatch = product.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const categoryMatch =
        category === "All" ||
        product.category === category;

      return searchMatch && categoryMatch;
    });
  }, [search, category]);

  const updateQuantity = (
    productId: number,
    value: number
  ) => {
    setQuantities((previous) => ({
      ...previous,
      [productId]: Math.max(0, value)
    }));
  };

  const selectedProducts = products.filter(
    (product) => (quantities[product.id] || 0) > 0
  );

  const totalProducts = selectedProducts.length;

  const totalUnits = selectedProducts.reduce(
    (total, product) =>
      total + (quantities[product.id] || 0),
    0
  );

  const subtotal = selectedProducts.reduce(
    (total, product) =>
      total +
      product.price *
        (quantities[product.id] || 0),
    0
  );

  const addAllToCart = () => {
    if (selectedProducts.length === 0) {
      setMessage(
        "Please enter quantity for at least one product."
      );
      return;
    }

    const savedCart =
      localStorage.getItem("officekart-cart");

    const cart = savedCart
      ? JSON.parse(savedCart)
      : [];

    selectedProducts.forEach((product) => {
      const quantity =
        quantities[product.id] || 0;

      const existingProduct = cart.find(
        (item: { name: string }) =>
          item.name === product.name
      );

      if (existingProduct) {
        existingProduct.quantity += quantity;
      } else {
        cart.push({
          name: product.name,
          price: product.price,
          image: "",
          quantity
        });
      }
    });

    localStorage.setItem(
      "officekart-cart",
      JSON.stringify(cart)
    );

    setMessage(
      `${totalProducts} products and ${totalUnits} units added to one cart.`
    );
  };

  const clearSelection = () => {
    setQuantities({});
    setMessage("");
  };

  return (
    <main className="min-h-screen bg-slate-50">

      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">

          <a
            href="/"
            className="text-2xl font-extrabold text-blue-700"
          >
            OfficeKart
          </a>

          <div className="flex items-center gap-3">

            <span className="hidden text-sm font-semibold text-slate-600 sm:block">
              {totalProducts} products selected
            </span>

            <a
              href="/cart"
              className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white"
            >
              Cart
            </a>

          </div>

        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8">

        <div className="rounded-3xl bg-slate-900 p-7 text-white md:p-10">

          <p className="font-semibold uppercase text-blue-300">
            B2B Office Procurement
          </p>

          <h1 className="mt-2 text-3xl font-extrabold md:text-5xl">
            Buy All Office Products Together
          </h1>

          <p className="mt-4 max-w-3xl text-slate-300">
            Select the quantity you need for any number of products.
            You can order one product or hundreds of different products
            in a single order.
          </p>

        </div>

        <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">

          <div className="grid gap-4 md:grid-cols-3">

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search any office product..."
              className="rounded-xl border px-4 py-3 outline-none focus:border-blue-600 md:col-span-2"
            />

            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              className="rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-600"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

          </div>

        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">

          <div className="hidden grid-cols-12 gap-4 border-b bg-slate-100 px-5 py-4 text-sm font-bold md:grid">

            <div className="col-span-1">
              No.
            </div>

            <div className="col-span-5">
              Product
            </div>

            <div className="col-span-2">
              Category
            </div>

            <div className="col-span-2">
              Price
            </div>

            <div className="col-span-2">
              Quantity
            </div>

          </div>

          {filteredProducts.map((product) => {

            const quantity =
              quantities[product.id] || 0;

            return (
              <div
                key={product.id}
                className={
                  "grid gap-3 border-b px-5 py-4 md:grid-cols-12 md:items-center md:gap-4 " +
                  (quantity > 0
                    ? "bg-blue-50"
                    : "bg-white")
                }
              >

                <div className="font-bold text-slate-400 md:col-span-1">
                  {product.id}
                </div>

                <div className="md:col-span-5">

                  <p className="font-bold text-slate-900">
                    {product.name}
                  </p>

                  <p className="text-xs text-slate-500">
                    Unit: {product.unit}
                  </p>

                </div>

                <div className="hidden text-sm text-slate-500 md:col-span-2 md:block">
                  {product.category}
                </div>

                <div className="font-bold md:col-span-2">
                  Rs. {product.price.toFixed(2)}
                </div>

                <div className="md:col-span-2">

                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(event) =>
                      updateQuantity(
                        product.id,
                        Number(event.target.value)
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2 font-bold outline-none focus:border-blue-600"
                  />

                </div>

              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-lg font-bold">
                No products found
              </p>

              <p className="mt-2 text-slate-500">
                Try another product name or category.
              </p>
            </div>
          )}

        </div>

        <div className="sticky bottom-0 mt-6 rounded-2xl border bg-white p-5 shadow-lg">

          <div className="grid gap-5 md:grid-cols-4 md:items-center">

            <div>
              <p className="text-sm text-slate-500">
                Selected Products
              </p>

              <p className="text-2xl font-extrabold">
                {totalProducts}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Total Units
              </p>

              <p className="text-2xl font-extrabold">
                {totalUnits}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Estimated Subtotal
              </p>

              <p className="text-2xl font-extrabold text-blue-700">
                Rs. {subtotal.toFixed(2)}
              </p>
            </div>

            <div className="flex gap-2">

              <button
                onClick={clearSelection}
                className="flex-1 rounded-xl border px-4 py-3 font-bold"
              >
                Clear
              </button>

              <button
                onClick={addAllToCart}
                className="flex-1 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800"
              >
                Add All to Cart
              </button>

            </div>

          </div>

          {message && (
            <div className="mt-4 rounded-xl bg-green-50 p-4 text-center font-semibold text-green-700">
              {message}
            </div>
          )}

        </div>

      </section>

    </main>
  );
}
