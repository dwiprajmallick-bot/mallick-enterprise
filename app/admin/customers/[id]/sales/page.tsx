"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Customer = {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  companyName?: string | null;
  gstin?: string | null;
  address?: string | null;
};

type Product = {
  id: string;
  name?: string | null;
  sku?: string | null;
};

type OrderItem = {
  id: string;
  productId?: string;
  quantity?: number;
  unitPrice?: number;
  gstRate?: number;
  product?: Product | null;
};

type Order = {
  id: string;
  orderNumber: string;
  customerId: string;
  subtotal?: number;
  deliveryCharge?: number;
  gstAmount?: number;
  totalAmount?: number;
  paymentStatus?: string | null;
  orderStatus?: string | null;
  paymentMethod?: string | null;
  shippingName?: string | null;
  shippingPhone?: string | null;
  createdAt?: string;
  updatedAt?: string;
  notes?: string | null;
  items?: OrderItem[];
};

type Payment = {
  id: string;
  paymentNumber?: string | null;
  type?: string | null;
  status?: string | null;
  orderId?: string | null;
  amountPaise?: number;
  method?: string | null;
  reference?: string | null;
  notes?: string | null;
  paidAt?: string;
};

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(status?: string | null) {
  const value = String(status || "").toUpperCase();

  if (
    value === "PAID" ||
    value === "SUCCESS" ||
    value === "COMPLETED" ||
    value === "RECEIVED"
  ) {
    return "bg-green-100 text-green-700";
  }

  if (
    value === "CANCELLED" ||
    value === "FAILED" ||
    value === "REJECTED"
  ) {
    return "bg-red-100 text-red-700";
  }

  if (
    value === "PARTIAL" ||
    value === "PENDING" ||
    value === "UNPAID"
  ) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

function paymentSignedAmount(payment: Payment) {
  const amount = Number(payment.amountPaise || 0) / 100;

  const type = String(payment.type || "").toUpperCase();

  if (type.includes("REVERSAL")) {
    return -amount;
  }

  if (type === "RECEIVE") {
    return amount;
  }

  return 0;
}

export default function CustomerSalesPage() {
  const params = useParams();
  const router = useRouter();

  const customerId = String(params?.id || "");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showPaymentBox, setShowPaymentBox] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState("");

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  async function loadData() {
    if (!customerId) return;

    setLoading(true);
    setError("");

    try {
      const customerResponse = await fetch(
        `/api/admin/customers/${customerId}`,
        {
          cache: "no-store",
        }
      );

      if (!customerResponse.ok) {
        throw new Error("CUSTOMER_LOAD_FAILED");
      }

      const customerData = await customerResponse.json();

      const loadedCustomer =
        customerData?.customer ||
        customerData?.data ||
        customerData;

      setCustomer(loadedCustomer || null);

      const ordersResponse = await fetch(
        `/api/admin/customers/${customerId}/orders`,
        {
          cache: "no-store",
        }
      );

      if (!ordersResponse.ok) {
        throw new Error("ORDERS_LOAD_FAILED");
      }

      const ordersData = await ordersResponse.json();

      const loadedOrders =
        ordersData?.orders ||
        ordersData?.data ||
        [];

      setOrders(
        Array.isArray(loadedOrders)
          ? loadedOrders
          : []
      );

      const paymentResponse = await fetch(
        `/api/admin/payments?customerId=${encodeURIComponent(
          customerId
        )}`,
        {
          cache: "no-store",
        }
      );

      if (paymentResponse.ok) {
        const paymentData =
          await paymentResponse.json();

        const loadedPayments =
          paymentData?.payments ||
          paymentData?.data ||
          [];

        setPayments(
          Array.isArray(loadedPayments)
            ? loadedPayments
            : []
        );
      } else {
        setPayments([]);
      }
    } catch {
      setError(
        "Unable to load customer sales information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [customerId]);

  const customerPayments = useMemo(() => {
    return payments.filter(
      (payment) =>
        String(payment.type || "").toUpperCase() ===
        "RECEIVE" ||
        String(payment.type || "")
          .toUpperCase()
          .includes("REVERSAL")
    );
  }, [payments]);

  const totalSales = useMemo(() => {
    return orders.reduce(
      (sum, order) =>
        sum + Number(order.totalAmount || 0),
      0
    );
  }, [orders]);

  const totalPaid = useMemo(() => {
    return customerPayments.reduce(
      (sum, payment) =>
        sum + paymentSignedAmount(payment),
      0
    );
  }, [customerPayments]);

  const totalOutstanding = Math.max(
    0,
    totalSales - totalPaid
  );

  const selectedOrder = orders.find(
    (order) => order.id === selectedOrderId
  );

  const selectedOrderPaid = useMemo(() => {
    if (!selectedOrderId) return 0;

    return payments
      .filter(
        (payment) =>
          payment.orderId === selectedOrderId
      )
      .reduce(
        (sum, payment) =>
          sum + paymentSignedAmount(payment),
        0
      );
  }, [payments, selectedOrderId]);

  const selectedOrderOutstanding = Math.max(
    0,
    Number(selectedOrder?.totalAmount || 0) -
      selectedOrderPaid
  );

  function openPayment(orderId: string) {
    setSelectedOrderId(orderId);
    setAmount("");
    setReference("");
    setNotes("");
    setMethod("BANK_TRANSFER");
    setError("");
    setShowPaymentBox(true);
  }

  async function receivePayment() {
    if (!selectedOrderId) {
      setError("Please select an order.");
      return;
    }

    const amountValue = Number(amount);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (
      amountValue >
      selectedOrderOutstanding + 0.005
    ) {
      setError(
        `Payment cannot exceed outstanding amount of ${money(
          selectedOrderOutstanding
        )}.`
      );
      return;
    }

    setSavingPayment(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/payments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "RECEIVE",
            orderId: selectedOrderId,
            amountPaise: Math.round(
              amountValue * 100
            ),
            method,
            reference:
              reference.trim() || undefined,
            notes:
              notes.trim() || undefined,
          }),
        }
      );

      const data = await response.json().catch(
        () => null
      );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "PAYMENT_RECEIVE_FAILED"
        );
      }

      setShowPaymentBox(false);
      setAmount("");
      setReference("");
      setNotes("");
      setSelectedOrderId("");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to receive payment."
      );
    } finally {
      setSavingPayment(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            Loading customer sales...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              onClick={() =>
                router.push(
                  `/admin/customers/${customerId}`
                )
              }
              className="mb-3 text-sm font-bold text-blue-600 hover:underline"
            >
              ← Back to Customer
            </button>

            <h1 className="text-3xl font-black text-slate-900">
              Customer Sales & Accounts
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {customer?.companyName ||
                customer?.name ||
                "Customer"}
            </p>
          </div>

          
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* CUSTOMER */}
        <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Customer
              </p>
              <p className="mt-2 font-extrabold text-slate-900">
                {customer?.companyName ||
                  customer?.name ||
                  "-"}
              </p>
              {customer?.companyName &&
                customer?.name && (
                  <p className="mt-1 text-sm text-slate-500">
                    {customer.name}
                  </p>
                )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Phone
              </p>
              <p className="mt-2 font-bold text-slate-800">
                {customer?.phone || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Email
              </p>
              <p className="mt-2 font-bold text-slate-800">
                {customer?.email || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                GSTIN
              </p>
              <p className="mt-2 font-bold text-slate-800">
                {customer?.gstin || "-"}
              </p>
            </div>

          </div>
        </section>

        {/* SUMMARY */}
        <section className="mb-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Orders
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {orders.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Sales
            </p>
            <p className="mt-2 text-3xl font-black text-blue-700">
              {money(totalSales)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Received
            </p>
            <p className="mt-2 text-3xl font-black text-green-700">
              {money(totalPaid)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Outstanding
            </p>
            <p className="mt-2 text-3xl font-black text-red-700">
              {money(totalOutstanding)}
            </p>
          </div>

        </section>

        {/* PAYMENT BOX */}
        {showPaymentBox && (
          <section className="mb-6 rounded-3xl border border-green-200 bg-white p-6 shadow-sm">

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Receive Customer Payment
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedOrder?.orderNumber ||
                    "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-red-50 px-5 py-3">
                <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                  Outstanding
                </span>
                <p className="text-xl font-black text-red-700">
                  {money(
                    selectedOrderOutstanding
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Amount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value)
                  }
                  placeholder="Enter amount"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Payment Method
                </label>

                <select
                  value={method}
                  onChange={(e) =>
                    setMethod(e.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-green-500"
                >
                  <option value="BANK_TRANSFER">
                    Bank Transfer
                  </option>
                  <option value="UPI">
                    UPI
                  </option>
                  <option value="CASH">
                    Cash
                  </option>
                  <option value="CARD">
                    Card
                  </option>
                  <option value="CHEQUE">
                    Cheque
                  </option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Reference
                </label>

                <input
                  value={reference}
                  onChange={(e) =>
                    setReference(e.target.value)
                  }
                  placeholder="UTR / transaction / cheque no."
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Notes
                </label>

                <input
                  value={notes}
                  onChange={(e) =>
                    setNotes(e.target.value)
                  }
                  placeholder="Payment notes"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-500"
                />
              </div>

            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={receivePayment}
                disabled={savingPayment}
                className="rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {savingPayment
                  ? "Saving..."
                  : "Confirm Payment Received"}
              </button>

              <button
                onClick={() => {
                  setShowPaymentBox(false);
                  setSelectedOrderId("");
                }}
                className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700"
              >
                Close
              </button>
            </div>

          </section>
        )}

        {/* ORDERS */}
        <section className="mb-6 overflow-hidden rounded-3xl bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-xl font-black text-slate-900">
              Sales / Order History
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Customer-wise sales, payment and
              outstanding records.
            </p>
          </div>

          {orders.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No orders found for this customer.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4">
                      Order
                    </th>
                    <th className="px-5 py-4">
                      Date
                    </th>
                    <th className="px-5 py-4">
                      Status
                    </th>
                    <th className="px-5 py-4 text-right">
                      Total
                    </th>
                    <th className="px-5 py-4">
                      Payment
                    </th>
                    <th className="px-5 py-4 text-right">
                      Outstanding
                    </th>
                    <th className="px-5 py-4 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => {
                    const orderPaid =
                      payments
                        .filter(
                          (payment) =>
                            payment.orderId ===
                            order.id
                        )
                        .reduce(
                          (sum, payment) =>
                            sum +
                            paymentSignedAmount(
                              payment
                            ),
                          0
                        );

                    const orderOutstanding =
                      Math.max(
                        0,
                        Number(
                          order.totalAmount || 0
                        ) - orderPaid
                      );

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-slate-100"
                      >
                        <td className="px-5 py-4">
                          
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {dateTime(
                            order.createdAt
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                              order.orderStatus
                            )}`}
                          >
                            {order.orderStatus ||
                              "PENDING"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right font-black">
                          {money(
                            Number(
                              order.totalAmount || 0
                            )
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                              order.paymentStatus
                            )}`}
                          >
                            {order.paymentStatus ||
                              "PENDING"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right font-black text-red-700">
                          {money(orderOutstanding)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {orderOutstanding > 0 &&
                            String(
                              order.orderStatus ||
                                ""
                            ).toUpperCase() !==
                              "CANCELLED" && (
                              <button
                                onClick={() =>
                                  openPayment(
                                    order.id
                                  )
                                }
                                className="rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white"
                              >
                                Receive
                              </button>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </section>

        {/* PAYMENT HISTORY */}
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-xl font-black text-slate-900">
              Payment History
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Audited customer payment records.
            </p>
          </div>

          {customerPayments.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No customer payment records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4">
                      Payment
                    </th>
                    <th className="px-5 py-4">
                      Type
                    </th>
                    <th className="px-5 py-4">
                      Order
                    </th>
                    <th className="px-5 py-4">
                      Method
                    </th>
                    <th className="px-5 py-4">
                      Reference
                    </th>
                    <th className="px-5 py-4">
                      Date
                    </th>
                    <th className="px-5 py-4 text-right">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {customerPayments.map(
                    (payment) => (
                      <tr
                        key={payment.id}
                        className="border-b border-slate-100"
                      >
                        <td className="px-5 py-4 font-black">
                          {payment.paymentNumber ||
                            payment.id}
                        </td>

                        <td className="px-5 py-4">
                          {payment.type || "-"}
                        </td>

                        <td className="px-5 py-4">
                          {orders.find(
                            (order) =>
                              order.id ===
                              payment.orderId
                          )?.orderNumber ||
                            "-"}
                        </td>

                        <td className="px-5 py-4">
                          {payment.method || "-"}
                        </td>

                        <td className="px-5 py-4">
                          {payment.reference || "-"}
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {dateTime(
                            payment.paidAt
                          )}
                        </td>

                        <td
                          className={`px-5 py-4 text-right font-black ${
                            paymentSignedAmount(
                              payment
                            ) < 0
                              ? "text-red-700"
                              : "text-green-700"
                          }`}
                        >
                          {money(
                            Math.abs(
                              paymentSignedAmount(
                                payment
                              )
                            )
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

        </section>

      </div>
    </main>
  );
}