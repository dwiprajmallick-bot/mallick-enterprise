"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type OrderItem = {
  id: string;
  productId: string;
  product?: {
    name?: string;
    sku?: string;
    stock?: number;
  } | null;
  quantity?: number;
  unitPrice?: number;
  gstRate?: number;
  gstAmount?: number;
  totalAmount?: number;
};

type Order = {
  id: string;
  orderNumber: string;
  customerId: string;
  orderStatus?: string;
  paymentStatus?: string;
  customer?: {
    name?: string;
    companyName?: string | null;
  } | null;
  items?: OrderItem[];
};

type PreviousReturnItem = {
  productId: string;
  quantity: number;
};

type PreviousReturn = {
  id: string;
  status?: string;
  items?: PreviousReturnItem[];
};

type ReturnRow = {
  productId: string;
  productName: string;
  sku: string;
  soldQuantity: number;
  returnedQuantity: number;
  availableQuantity: number;
  unitPrice: number;
  gstRate: number;
  quantity: number;
};

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CreateSalesReturnPage() {
  const params = useParams();
  const router = useRouter();

  const orderId = String(params?.id || "");

  const [order, setOrder] =
    useState<Order | null>(null);

  const [previousReturns, setPreviousReturns] =
    useState<PreviousReturn[]>([]);

  const [rows, setRows] =
    useState<ReturnRow[]>([]);

  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const [
          orderResponse,
          returnsResponse,
        ] = await Promise.all([
          fetch(
            `/api/admin/orders/${orderId}`,
            {
              cache: "no-store",
            }
          ),

          fetch(
            `/api/admin/returns`,
            {
              cache: "no-store",
            }
          ),
        ]);

        const orderData =
          await orderResponse.json();

        if (!orderResponse.ok) {
          throw new Error(
            orderData?.error ||
              "Unable to load order."
          );
        }

        const returnsData =
          await returnsResponse.json();

        if (!returnsResponse.ok) {
          throw new Error(
            returnsData?.error ||
              "Unable to load previous returns."
          );
        }

        const loadedOrder =
          orderData?.order ||
          orderData?.data ||
          orderData;

        setOrder(loadedOrder);

        const allReturns =
          returnsData?.returns ||
          returnsData?.data ||
          [];

        const matchingReturns =
          Array.isArray(allReturns)
            ? allReturns.filter(
                (item: {
                  orderId?: string;
                }) =>
                  item.orderId === orderId
              )
            : [];

        setPreviousReturns(
          matchingReturns
        );

        const previousMap =
          new Map<string, number>();

        for (const salesReturn of matchingReturns) {
          const items =
            salesReturn?.items || [];

          for (const item of items) {
            previousMap.set(
              item.productId,
              (previousMap.get(
                item.productId
              ) || 0) +
                Number(
                  item.quantity || 0
                )
            );
          }
        }

        const orderItems =
          Array.isArray(
            loadedOrder?.items
          )
            ? loadedOrder.items
            : [];

        const mappedRows =
          orderItems.map(
            (item: OrderItem) => {
              const soldQuantity =
                Number(
                  item.quantity || 0
                );

              const returnedQuantity =
                previousMap.get(
                  item.productId
                ) || 0;

              const availableQuantity =
                Math.max(
                  0,
                  soldQuantity -
                    returnedQuantity
                );

              return {
                productId:
                  item.productId,

                productName:
                  item.product?.name ||
                  "Product",

                sku:
                  item.product?.sku ||
                  "-",

                soldQuantity,

                returnedQuantity,

                availableQuantity,

                unitPrice:
                  Number(
                    item.unitPrice || 0
                  ),

                gstRate:
                  Number(
                    item.gstRate || 0
                  ),

                quantity: 0,
              };
            }
          );

        setRows(mappedRows);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load return form."
        );
      } finally {
        setLoading(false);
      }
    }

    if (orderId) {
      load();
    }
  }, [orderId]);

  const selectedRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          Number(row.quantity) > 0
      ),
    [rows]
  );

  const totals = useMemo(() => {
    let subtotal = 0;
    let gst = 0;

    for (const row of selectedRows) {
      const lineSubtotal =
        row.unitPrice *
        row.quantity;

      const lineGst =
        (lineSubtotal *
          row.gstRate) /
        100;

      subtotal += lineSubtotal;
      gst += lineGst;
    }

    return {
      subtotal,
      gst,
      total:
        subtotal + gst,
    };
  }, [selectedRows]);

  function updateQuantity(
    productId: string,
    value: string
  ) {
    const numericValue =
      value === ""
        ? 0
        : Number(value);

    setRows((current) =>
      current.map((row) =>
        row.productId ===
        productId
          ? {
              ...row,
              quantity:
                Number.isFinite(
                  numericValue
                )
                  ? Math.max(
                      0,
                      Math.min(
                        row.availableQuantity,
                        Math.floor(
                          numericValue
                        )
                      )
                    )
                  : 0,
            }
          : row
      )
    );
  }

  async function submitReturn() {
    setError("");
    setSuccess("");

    if (!reason.trim()) {
      setError(
        "Please enter the return reason."
      );
      return;
    }

    if (selectedRows.length === 0) {
      setError(
        "Please select at least one product quantity."
      );
      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          "/api/admin/returns",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              orderId,
              reason:
                reason.trim(),
              notes:
                notes.trim() ||
                undefined,

              items:
                selectedRows.map(
                  (row) => ({
                    productId:
                      row.productId,
                    quantity:
                      row.quantity,
                  })
                ),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to create sales return."
        );
      }

      const returnId =
        data?.return?.id ||
        data?.data?.id;

      setSuccess(
        `Sales return ${
          data?.return?.returnNumber ||
          ""
        } created successfully.`
      );

      if (returnId) {
        router.push(
          `/admin/returns/${returnId}`
        );
        return;
      }

      router.push(
        "/admin/returns"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create sales return."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-10 text-center">
          Loading order...
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error || "Order not found."}
          </div>
        </div>
      </main>
    );
  }

  const cancelled =
    String(
      order.orderStatus || ""
    ).toUpperCase() ===
    "CANCELLED";

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <button
              onClick={() =>
                router.push(
                  `/admin/orders/${order.id}`
                )
              }
              className="mb-3 text-sm font-bold text-blue-600 hover:underline"
            >
              ← Back to Order
            </button>

            <h1 className="text-3xl font-black text-slate-900">
              Create Sales Return
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Order{" "}
              <span className="font-bold text-slate-700">
                {order.orderNumber}
              </span>
            </p>
          </div>

          <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Customer
            </p>

            <p className="mt-1 font-black text-slate-900">
              {order.customer?.companyName ||
                order.customer?.name ||
                "-"}
            </p>
          </div>

        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
            {success}
          </div>
        )}

        {/* CANCELLED WARNING */}
        {cancelled && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-black text-red-800">
              This order is cancelled.
            </p>

            <p className="mt-1 text-sm text-red-700">
              A cancelled order cannot be returned.
            </p>
          </div>
        )}

        {/* PREVIOUS RETURNS */}
        <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="text-xl font-black text-slate-900">
                Return Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Previously created returns for this order:
                {" "}
                <span className="font-bold text-slate-700">
                  {previousReturns.length}
                </span>
              </p>
            </div>

            <div className="text-sm">
              <span className="text-slate-500">
                Order status:
              </span>{" "}
              <span className="font-black text-slate-900">
                {order.orderStatus ||
                  "-"}
              </span>
            </div>

          </div>

        </section>

        {/* PRODUCT TABLE */}
        <section className="mb-6 overflow-hidden rounded-3xl bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-xl font-black text-slate-900">
              Select Products
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enter the quantity being returned.
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>
                <tr className="bg-slate-900 text-left text-xs uppercase tracking-wider text-white">

                  <th className="px-5 py-4">
                    Product
                  </th>

                  <th className="px-5 py-4">
                    SKU
                  </th>

                  <th className="px-5 py-4 text-right">
                    Sold
                  </th>

                  <th className="px-5 py-4 text-right">
                    Previous Return
                  </th>

                  <th className="px-5 py-4 text-right">
                    Available
                  </th>

                  <th className="px-5 py-4 text-right">
                    Rate
                  </th>

                  <th className="px-5 py-4 text-right">
                    GST
                  </th>

                  <th className="px-5 py-4 text-right">
                    Return Qty
                  </th>

                </tr>
              </thead>

              <tbody>

                {rows.map((row) => (
                  <tr
                    key={row.productId}
                    className="border-b border-slate-100"
                  >

                    <td className="px-5 py-4 font-bold text-slate-900">
                      {row.productName}
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {row.sku}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold">
                      {row.soldQuantity}
                    </td>

                    <td className="px-5 py-4 text-right text-slate-500">
                      {row.returnedQuantity}
                    </td>

                    <td className="px-5 py-4 text-right font-black text-blue-700">
                      {row.availableQuantity}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {money(
                        row.unitPrice
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {row.gstRate}%
                    </td>

                    <td className="px-5 py-4 text-right">

                      <input
                        type="number"
                        min="0"
                        max={
                          row.availableQuantity
                        }
                        step="1"
                        disabled={
                          cancelled ||
                          row.availableQuantity <=
                            0
                        }
                        value={
                          row.quantity ===
                          0
                            ? ""
                            : row.quantity
                        }
                        onChange={(e) =>
                          updateQuantity(
                            row.productId,
                            e.target.value
                          )
                        }
                        className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-right font-bold outline-none focus:border-blue-500 disabled:bg-slate-100"
                        placeholder="0"
                      />

                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>

          {rows.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-500">
              No products found in this order.
            </div>
          )}

        </section>

        {/* REASON */}
        <section className="mb-6 grid gap-6 lg:grid-cols-2">

          <div className="rounded-3xl bg-white p-6 shadow-sm">

            <label className="text-sm font-black text-slate-800">
              Return Reason *
            </label>

            <textarea
              value={reason}
              onChange={(e) =>
                setReason(
                  e.target.value
                )
              }
              rows={5}
              disabled={cancelled}
              placeholder="Example: Damaged product, wrong item supplied, excess quantity, customer requirement..."
              className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
            />

          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">

            <label className="text-sm font-black text-slate-800">
              Internal Notes
            </label>

            <textarea
              value={notes}
              onChange={(e) =>
                setNotes(
                  e.target.value
                )
              }
              rows={5}
              disabled={cancelled}
              placeholder="Internal notes for admin, accounts or warehouse..."
              className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
            />

          </div>

        </section>

        {/* TOTAL + SUBMIT */}
        <section className="mb-10 flex justify-end">

          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-black text-slate-900">
              Return Summary
            </h2>

            <div className="mt-5 space-y-3">

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  Selected Products
                </span>

                <span className="font-bold">
                  {selectedRows.length}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  Subtotal
                </span>

                <span className="font-bold">
                  {money(
                    totals.subtotal
                  )}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  GST
                </span>

                <span className="font-bold">
                  {money(
                    totals.gst
                  )}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-4">

                <div className="flex items-center justify-between">

                  <span className="text-xl font-black text-slate-900">
                    Return Total
                  </span>

                  <span className="text-2xl font-black text-blue-700">
                    {money(
                      totals.total
                    )}
                  </span>

                </div>

              </div>

            </div>

            <button
              onClick={submitReturn}
              disabled={
                saving ||
                cancelled ||
                selectedRows.length === 0
              }
              className="mt-6 w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving
                ? "Creating Return..."
                : "Create Sales Return"}
            </button>

            <p className="mt-3 text-center text-xs leading-5 text-slate-400">
              Creating the return will increase
              the returned products' stock and
              create an audit record.
            </p>

          </div>

        </section>

      </div>
    </main>
  );
}