"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import BusinessNav from "../_components/BusinessNav";

type Payment = {
  id: string;
  paymentNumber: string;
  type: string;
  status: string;
  orderId: string | null;
  purchaseId: string | null;
  amountPaise: number;
  method: string;
  reference: string | null;
  paidAt: string;
};

type Order = {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
};

type Purchase = {
  id: string;
  purchaseNumber: string;
  totalPaise: number;
  paymentStatus: string;
  status: string;
};

function money(paise: number) {
  return `₹${(
    Number(paise || 0) / 100
  ).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PaymentsPage() {
  const [
    payments,
    setPayments,
  ] = useState<Payment[]>([]);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [
    purchases,
    setPurchases,
  ] = useState<Purchase[]>([]);

  const [type, setType] =
    useState("RECEIVE");

  const [
    sourceId,
    setSourceId,
  ] = useState("");

  const [
    amountPaise,
    setAmountPaise,
  ] = useState("");

  const [method, setMethod] =
    useState("UPI");

  const [
    reference,
    setReference,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  async function load() {
    setError("");

    try {
      const [
        paymentResponse,
        orderResponse,
        purchaseResponse,
      ] = await Promise.all([
        fetch(
          "/api/admin/payments",
          {
            credentials:
              "include",
          }
        ),
        fetch(
          "/api/admin/orders",
          {
            credentials:
              "include",
          }
        ),
        fetch(
          "/api/admin/purchases",
          {
            credentials:
              "include",
          }
        ),
      ]);

      const paymentData =
        await paymentResponse.json();

      const orderData =
        await orderResponse.json();

      const purchaseData =
        await purchaseResponse.json();

      if (
        !paymentResponse.ok ||
        !paymentData.success
      ) {
        throw new Error(
          paymentData.message ||
            "Unable to load payments."
        );
      }

      if (
        !orderResponse.ok ||
        !orderData.success
      ) {
        throw new Error(
          orderData.message ||
            "Unable to load orders."
        );
      }

      if (
        !purchaseResponse.ok ||
        !purchaseData.success
      ) {
        throw new Error(
          purchaseData.message ||
            "Unable to load purchases."
        );
      }

      setPayments(
        paymentData.payments
      );

      setOrders(
        orderData.orders
      );

      setPurchases(
        purchaseData.purchases
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load payment data."
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(
    event: FormEvent
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const parsed =
      Number(
        amountPaise
      );

    if (
      !sourceId ||
      !Number.isInteger(
        parsed
      ) ||
      parsed <= 0
    ) {
      setError(
        "Select a source and enter a positive payment amount in paise."
      );
      return;
    }

    try {
      const response =
        await fetch(
          "/api/admin/payments",
          {
            method: "POST",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                type,
                ...(type ===
                "RECEIVE"
                  ? {
                      orderId:
                        sourceId,
                    }
                  : {
                      purchaseId:
                        sourceId,
                    }),
                amountPaise:
                  parsed,
                method,
                reference:
                  reference ||
                  undefined,
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Payment failed."
        );
      }

      setMessage(
        `Payment ${data.payment.paymentNumber} recorded.`
      );

      setAmountPaise("");
      setReference("");
      setSourceId("");

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Payment failed."
      );
    }
  }

  async function reversePayment(
    id: string
  ) {
    const reason =
      window.prompt(
        "Enter reversal reason:"
      );

    if (!reason?.trim()) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/admin/payments/${id}/reverse`,
          {
            method: "POST",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                reason,
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Payment reversal failed."
        );
      }

      setMessage(
        "Payment reversal recorded."
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Payment reversal failed."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <BusinessNav />

      <div className="mx-auto max-w-7xl p-6">
        <h1 className="text-3xl font-bold">
          Payments
        </h1>

        {message ? (
          <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form
          onSubmit={submit}
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <select
              value={type}
              onChange={(e) => {
                setType(
                  e.target.value
                );
                setSourceId("");
              }}
              className="rounded-xl border px-4 py-3"
            >
              <option value="RECEIVE">
                Receive from Customer
              </option>
              <option value="PAY">
                Pay Supplier
              </option>
            </select>

            <select
              value={sourceId}
              onChange={(e) =>
                setSourceId(
                  e.target.value
                )
              }
              className="rounded-xl border px-4 py-3"
              required
            >
              <option value="">
                Select source
              </option>

              {type ===
              "RECEIVE"
                ? orders
                    .filter(
                      (order) =>
                        order.orderStatus !==
                        "CANCELLED"
                    )
                    .map(
                      (order) => (
                        <option
                          key={
                            order.id
                          }
                          value={
                            order.id
                          }
                        >
                          {
                            order.orderNumber
                          }{" "}
                          —{" "}
                          {money(
                            Math.round(
                              order.totalAmount *
                                100
                            )
                          )}
                        </option>
                      )
                    )
                : purchases
                    .filter(
                      (purchase) =>
                        purchase.status !==
                        "CANCELLED"
                    )
                    .map(
                      (
                        purchase
                      ) => (
                        <option
                          key={
                            purchase.id
                          }
                          value={
                            purchase.id
                          }
                        >
                          {
                            purchase.purchaseNumber
                          }{" "}
                          —{" "}
                          {money(
                            purchase.totalPaise
                          )}
                        </option>
                      )
                    )}
            </select>

            <input
              type="number"
              min="1"
              value={
                amountPaise
              }
              onChange={(e) =>
                setAmountPaise(
                  e.target.value
                )
              }
              placeholder="Amount in paise"
              required
              className="rounded-xl border px-4 py-3"
            />

            <select
              value={method}
              onChange={(e) =>
                setMethod(
                  e.target.value
                )
              }
              className="rounded-xl border px-4 py-3"
            >
              <option value="UPI">
                UPI
              </option>
              <option value="BANK_TRANSFER">
                Bank Transfer
              </option>
              <option value="CASH">
                Cash
              </option>
              <option value="CARD">
                Card
              </option>
            </select>

            <input
              value={
                reference
              }
              onChange={(e) =>
                setReference(
                  e.target.value
                )
              }
              placeholder="Reference"
              className="rounded-xl border px-4 py-3"
            />
          </div>

          <button
            type="submit"
            className="mt-4 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
          >
            Record Payment
          </button>
        </form>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left">
                  Payment
                </th>
                <th className="p-3 text-left">
                  Type
                </th>
                <th className="p-3 text-left">
                  Amount
                </th>
                <th className="p-3 text-left">
                  Method
                </th>
                <th className="p-3 text-left">
                  Status
                </th>
                <th className="p-3 text-left">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {payments.map(
                (payment) => (
                  <tr
                    key={
                      payment.id
                    }
                    className="border-t"
                  >
                    <td className="p-3 font-medium">
                      {
                        payment.paymentNumber
                      }
                    </td>

                    <td className="p-3">
                      {
                        payment.type
                      }
                    </td>

                    <td className="p-3">
                      {money(
                        payment.amountPaise
                      )}
                    </td>

                    <td className="p-3">
                      {
                        payment.method
                      }
                    </td>

                    <td className="p-3">
                      {
                        payment.status
                      }
                    </td>

                    <td className="p-3">
                      {payment.status ===
                      "SUCCESS" &&
                      !payment.type.endsWith(
                        "_REVERSAL"
                      ) ? (
                        <button
                          type="button"
                          onClick={() =>
                            reversePayment(
                              payment.id
                            )
                          }
                          className="text-red-600"
                        >
                          Reverse
                        </button>
                      ) : (
                        <span className="text-slate-400">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}