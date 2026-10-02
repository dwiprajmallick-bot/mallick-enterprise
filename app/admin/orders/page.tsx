"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  companyName?: string | null;
  gstin?: string | null;
};

type Product = {
  id: string;
  name: string;
  sku?: string | null;
  stock?: number | null;
  sellingPrice?: number | null;
  purchasePrice?: number | null;
};

type OrderItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
};

type Order = {
  id: string;
  orderNumber: string;
  customerId: string;
  subtotal?: number;
  deliveryCharge?: number;
  gstAmount?: number;
  totalAmount?: number;
  paymentStatus?: string;
  orderStatus?: string;
  paymentMethod?: string;
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPincode?: string;
  createdAt?: string;
  updatedAt?: string;
  customer?: Customer;
  items?: Array<{
    id?: string;
    productId?: string;
    quantity?: number;
    unitPrice?: number;
    gstRate?: number;
    product?: Product;
  }>;
};

const emptyItem = (): OrderItem => ({
  productId: "",
  quantity: 1,
  unitPrice: 0,
  gstRate: 0,
});

function money(value?: number | null) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<OrderItem[]>([
    emptyItem(),
  ]);

  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] =
    useState("COD");
  const [paymentReference, setPaymentReference] =
    useState("");

  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingAddress, setShippingAddress] =
    useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] =
    useState("West Bengal");
  const [shippingPincode, setShippingPincode] =
    useState("");

  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  async function fetchJson(url: string) {
    const response = await fetch(url, {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message || `Request failed: ${response.status}`
      );
    }

    return data;
  }

  async function loadData() {
    try {
      setLoading(true);
      setMessage("");

      const [
        orderData,
        customerData,
        productData,
      ] = await Promise.all([
        fetchJson("/api/admin/orders"),
        fetchJson("/api/admin/customers"),
        fetchJson("/api/admin/products"),
      ]);

      const orderRows = Array.isArray(orderData.orders)
        ? orderData.orders
        : Array.isArray(orderData.data)
          ? orderData.data
          : [];

      const customerRows =
        Array.isArray(customerData.customers)
          ? customerData.customers
          : Array.isArray(customerData.data)
            ? customerData.data
            : [];

      const productRows =
        Array.isArray(productData.products)
          ? productData.products
          : Array.isArray(productData.data)
            ? productData.data
            : [];

      setOrders(orderRows);
      setCustomers(customerRows);
      setProducts(productRows);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load sales data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setCustomerId("");
    setItems([emptyItem()]);
    setDeliveryCharge(0);
    setPaymentAmount(0);
    setPaymentMethod("COD");
    setPaymentReference("");

    setShippingName("");
    setShippingPhone("");
    setShippingAddress("");
    setShippingCity("");
    setShippingState("West Bengal");
    setShippingPincode("");

    setNotes("");
  }

  function openNewOrder() {
    resetForm();
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
  }

  function selectCustomer(id: string) {
    setCustomerId(id);

    const customer = customers.find(
      (item) => item.id === id
    );

    if (!customer) return;

    setShippingName(customer.name || "");
    setShippingPhone(customer.phone || "");
  }

  function updateItem(
    index: number,
    field: keyof OrderItem,
    value: string | number
  ) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]:
                field === "productId"
                  ? String(value)
                  : Number(value),
            }
          : item
      )
    );
  }

  function selectProduct(
    index: number,
    productId: string
  ) {
    const product = products.find(
      (item) => item.id === productId
    );

    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              productId,
              unitPrice:
                product?.sellingPrice || 0,
            }
          : item
      )
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      emptyItem(),
    ]);
  }

  function removeItem(index: number) {
    setItems((current) => {
      if (current.length === 1) return current;

      return current.filter(
        (_, itemIndex) => itemIndex !== index
      );
    });
  }

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 0) *
            Number(item.unitPrice || 0),
        0
      ),
    [items]
  );

  const gstAmount = useMemo(
    () =>
      items.reduce((sum, item) => {
        const taxable =
          Number(item.quantity || 0) *
          Number(item.unitPrice || 0);

        return (
          sum +
          taxable *
            (Number(item.gstRate || 0) / 100)
        );
      }, 0),
    [items]
  );

  const total =
    subtotal +
    gstAmount +
    Number(deliveryCharge || 0);

  const outstanding = Math.max(
    total - Number(paymentAmount || 0),
    0
  );

  async function createOrder(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!customerId) {
      setMessage("Please select a customer.");
      return;
    }

    const validItems = items.filter(
      (item) =>
        item.productId &&
        Number(item.quantity) > 0 &&
        Number(item.unitPrice) >= 0
    );

    if (validItems.length === 0) {
      setMessage(
        "Please add at least one valid product."
      );
      return;
    }

    if (Number(paymentAmount) > total) {
      setMessage(
        "Payment cannot exceed order total."
      );
      return;
    }

    if (!shippingName.trim()) {
      setMessage(
        "Shipping/customer name is required."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        "/api/admin/orders",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerId,

            items: validItems.map((item) => ({
              productId: item.productId,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              gstRate: Number(item.gstRate || 0),
            })),

            deliveryCharge: Number(
              deliveryCharge || 0
            ),

            paymentAmount: Number(
              paymentAmount || 0
            ),

            paymentMethod,

            paymentReference:
              paymentReference.trim() ||
              undefined,

            shippingName:
              shippingName.trim(),

            shippingPhone:
              shippingPhone.trim(),

            shippingAddress:
              shippingAddress.trim(),

            shippingCity:
              shippingCity.trim(),

            shippingState:
              shippingState.trim(),

            shippingPincode:
              shippingPincode.trim(),

            notes:
              notes.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.message ||
            "Order creation failed."
        );
      }

      setMessage(
        data.order?.orderNumber
          ? `Order ${data.order.orderNumber} created successfully.`
          : "Order created successfully."
      );

      setShowForm(false);
      resetForm();

      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Order creation failed."
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelOrder(order: Order) {
    const reason = window.prompt(
      `Enter cancellation reason for ${order.orderNumber}:`
    );

    if (!reason || !reason.trim()) return;

    try {
      const response = await fetch(
        `/api/admin/orders/${order.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: reason.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.message ||
            "Order cancellation failed."
        );
      }

      setMessage(
        `Order ${order.orderNumber} cancelled successfully.`
      );

      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Order cancellation failed."
      );
    }
  }

  const filteredOrders = orders.filter(
    (order) => {
      const query =
        search.trim().toLowerCase();

      if (!query) return true;

      return [
        order.orderNumber,
        order.customer?.name,
        order.customer?.companyName,
        order.customer?.phone,
        order.orderStatus,
        order.paymentStatus,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        );
    }
  );

  const completedCount = orders.filter(
    (order) =>
      String(
        order.orderStatus
      ).toUpperCase() === "COMPLETED"
  ).length;

  const pendingCount = orders.filter(
    (order) =>
      String(
        order.orderStatus
      ).toUpperCase() === "PENDING"
  ).length;

  const cancelledCount = orders.filter(
    (order) =>
      String(
        order.orderStatus
      ).toUpperCase() === "CANCELLED"
  ).length;

  const totalSales = orders.reduce(
    (sum, order) =>
      sum + Number(order.totalAmount || 0),
    0
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <header className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              দ্বীবরাজ মল্লিক • OfficeKart
            </p>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              Sales Order Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Customer orders, billing, payment and sales stock flow.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewOrder}
            className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white hover:bg-blue-700"
          >
            + New Sales Order
          </button>
        </header>

        {message && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-800">
            {message}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-5">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Orders
            </p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {orders.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Pending
            </p>
            <p className="mt-2 text-3xl font-extrabold text-amber-600">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Completed
            </p>
            <p className="mt-2 text-3xl font-extrabold text-green-700">
              {completedCount}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Cancelled
            </p>
            <p className="mt-2 text-3xl font-extrabold text-red-600">
              {cancelledCount}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Sales Value
            </p>
            <p className="mt-2 text-2xl font-extrabold text-blue-700">
              {money(totalSales)}
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Sales Register
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Customer-linked sales orders.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search order or customer..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 md:w-96"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              Loading sales orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-extrabold text-slate-800">
                No sales orders found
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Create a sales order to start customer billing.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-extrabold uppercase text-slate-500">
                      Order
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold uppercase text-slate-500">
                      Customer
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold uppercase text-slate-500">
                      Total
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold uppercase text-slate-500">
                      Payment
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold uppercase text-slate-500">
                      Order Status
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold uppercase text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold uppercase text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const cancelled =
                      String(
                        order.orderStatus
                      ).toUpperCase() ===
                      "CANCELLED";

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-5">
                          <p className="font-extrabold text-slate-900">
                            {order.orderNumber}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {order.paymentMethod ||
                              "—"}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <p className="font-bold text-slate-800">
                            {order.customer?.name ||
                              order.customerId}
                          </p>

                          {order.customer
                            ?.companyName && (
                            <p className="mt-1 text-xs text-slate-500">
                              {
                                order.customer
                                  .companyName
                              }
                            </p>
                          )}

                          <p className="mt-1 text-xs text-slate-400">
                            {order.customer?.phone ||
                              ""}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <p className="font-extrabold text-slate-900">
                            {money(
                              order.totalAmount
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-700">
                            {order.paymentStatus ||
                              "PENDING"}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`rounded-xl px-3 py-2 text-xs font-extrabold ${
                              cancelled
                                ? "bg-red-100 text-red-700"
                                : String(
                                      order.orderStatus
                                    ).toUpperCase() ===
                                    "COMPLETED"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {order.orderStatus ||
                              "PENDING"}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-sm text-slate-600">
                          {order.createdAt
                            ? new Date(
                                order.createdAt
                              ).toLocaleDateString(
                                "en-IN"
                              )
                            : "—"}
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                (window.location.href =
                                  `/admin/orders/${order.id}`)
                              }
                              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-100"
                            >
                              View
                            </button>

                            {!cancelled && (
                              <button
                                type="button"
                                onClick={() =>
                                  cancelOrder(order)
                                }
                                className="rounded-xl border border-red-200 px-4 py-2 text-xs font-extrabold text-red-600 hover:bg-red-50"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    New Sales Order
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Customer order and billing
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
                >
                  Close
                </button>
              </div>

              <form
                onSubmit={createOrder}
                className="space-y-6 p-6"
              >

                <section className="rounded-3xl border border-slate-200 p-5">
                  <h3 className="mb-4 text-lg font-extrabold text-slate-900">
                    Customer
                  </h3>

                  <select
                    required
                    value={customerId}
                    onChange={(event) =>
                      selectCustomer(
                        event.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
                  >
                    <option value="">
                      Select Customer
                    </option>

                    {customers.map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.name}
                        {customer.companyName
                          ? ` • ${customer.companyName}`
                          : ""}
                        {customer.phone
                          ? ` • ${customer.phone}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </section>

                <section className="rounded-3xl border border-slate-200 p-5">
                  <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">
                        Order Items
                      </h3>

                      <p className="text-sm text-slate-500">
                        Add products being sold.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addItem}
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
                    >
                      + Add Product
                    </button>
                  </div>

                  <div className="space-y-4">
                    {items.map((item, index) => {
                      const product =
                        products.find(
                          (product) =>
                            product.id ===
                            item.productId
                        );

                      const availableStock =
                        Number(
                          product?.stock || 0
                        );

                      return (
                        <div
                          key={index}
                          className="rounded-2xl bg-slate-50 p-4"
                        >
                          <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">

                            <div>
                              <label className="mb-2 block text-xs font-bold text-slate-600">
                                Product
                              </label>

                              <select
                                value={
                                  item.productId
                                }
                                onChange={(event) =>
                                  selectProduct(
                                    index,
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                              >
                                <option value="">
                                  Select Product
                                </option>

                                {products.map(
                                  (product) => (
                                    <option
                                      key={
                                        product.id
                                      }
                                      value={
                                        product.id
                                      }
                                    >
                                      {product.name}
                                      {product.sku
                                        ? ` • ${product.sku}`
                                        : ""}
                                      {` • Stock: ${
                                        product.stock ??
                                        0
                                      }`}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>

                            <div>
                              <label className="mb-2 block text-xs font-bold text-slate-600">
                                Quantity
                              </label>

                              <input
                                type="number"
                                min="1"
                                value={
                                  item.quantity
                                }
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "quantity",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                              />

                              {product && (
                                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                  Available:{" "}
                                  {
                                    availableStock
                                  }
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="mb-2 block text-xs font-bold text-slate-600">
                                Selling Price ₹
                              </label>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  item.unitPrice
                                }
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "unitPrice",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-xs font-bold text-slate-600">
                                GST %
                              </label>

                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={
                                  item.gstRate
                                }
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "gstRate",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500"
                              />
                            </div>

                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() =>
                                  removeItem(index)
                                }
                                className="w-full rounded-xl border border-red-200 px-3 py-3 text-xs font-extrabold text-red-600 hover:bg-red-50"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 text-right text-xs font-bold text-slate-500">
                            Line Total:{" "}
                            {money(
                              Number(
                                item.quantity || 0
                              ) *
                                Number(
                                  item.unitPrice ||
                                    0
                                ) *
                                (1 +
                                  Number(
                                    item.gstRate ||
                                      0
                                  ) /
                                    100)
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 p-5">
                  <h3 className="mb-4 text-lg font-extrabold text-slate-900">
                    Shipping / Delivery
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Name *
                      </label>

                      <input
                        required
                        value={shippingName}
                        onChange={(event) =>
                          setShippingName(
                            event.target.value
                          )
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Phone
                      </label>

                      <input
                        value={shippingPhone}
                        onChange={(event) =>
                          setShippingPhone(
                            event.target.value
                          )
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Address
                      </label>

                      <textarea
                        rows={3}
                        value={shippingAddress}
                        onChange={(event) =>
                          setShippingAddress(
                            event.target.value
                          )
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        City
                      </label>

                      <input
                        value={shippingCity}
                        onChange={(event) =>
                          setShippingCity(
                            event.target.value
                          )
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        State
                      </label>

                      <input
                        value={shippingState}
                        onChange={(event) =>
                          setShippingState(
                            event.target.value
                          )
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Pincode
                      </label>

                      <input
                        value={shippingPincode}
                        onChange={(event) =>
                          setShippingPincode(
                            event.target.value
                          )
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">

                  <div className="rounded-3xl border border-slate-200 p-5">
                    <h3 className="mb-4 text-lg font-extrabold text-slate-900">
                      Payment
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Payment Method
                        </label>

                        <select
                          value={paymentMethod}
                          onChange={(event) =>
                            setPaymentMethod(
                              event.target.value
                            )
                          }
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                        >
                          <option value="COD">
                            Cash on Delivery
                          </option>

                          <option value="UPI">
                            UPI
                          </option>

                          <option value="BANK_TRANSFER">
                            Bank Transfer
                          </option>

                          <option value="CARD">
                            Card
                          </option>

                          <option value="CASH">
                            Cash
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Payment Amount ₹
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(event) =>
                            setPaymentAmount(
                              Number(
                                event.target.value
                              )
                            )
                          }
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Payment Reference
                        </label>

                        <input
                          value={paymentReference}
                          onChange={(event) =>
                            setPaymentReference(
                              event.target.value
                            )
                          }
                          placeholder="Transaction / UTR / reference"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Notes
                        </label>

                        <textarea
                          rows={3}
                          value={notes}
                          onChange={(event) =>
                            setNotes(
                              event.target.value
                            )
                          }
                          placeholder="Order notes"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-slate-900 p-6 text-white">
                    <h3 className="text-lg font-extrabold">
                      Order Summary
                    </h3>

                    <div className="mt-6 space-y-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-300">
                          Subtotal
                        </span>

                        <span className="font-bold">
                          {money(subtotal)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-300">
                          GST
                        </span>

                        <span className="font-bold">
                          {money(gstAmount)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-300">
                          Delivery
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={deliveryCharge}
                          onChange={(event) =>
                            setDeliveryCharge(
                              Number(
                                event.target.value
                              )
                            )
                          }
                          className="w-36 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-right text-white outline-none"
                        />
                      </div>

                      <div className="border-t border-slate-700 pt-4">
                        <div className="flex justify-between text-lg">
                          <span className="font-extrabold">
                            Total
                          </span>

                          <span className="font-extrabold">
                            {money(total)}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between text-green-300">
                        <span>Received</span>

                        <span className="font-bold">
                          {money(
                            Number(
                              paymentAmount || 0
                            )
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between text-amber-300">
                        <span>Customer Outstanding</span>

                        <span className="font-bold">
                          {money(outstanding)}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 md:flex-row md:justify-end">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-blue-600 px-8 py-3 text-sm font-extrabold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Creating Order..."
                      : "Create Order & Process Sale"}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
