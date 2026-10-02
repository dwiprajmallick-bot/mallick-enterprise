"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import BusinessNav from "../_components/BusinessNav";

type Supplier = {
  id: string;
  name: string;
  supplierCode: string;
};

type Product = {
  id: string;
  name: string;
  stock: number;
};

type Purchase = {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  status: string;
  subtotalPaise: number;
  gstPaise: number;
  deliveryPaise: number;
  totalPaise: number;
  paymentStatus: string;
  createdAt: string;
};

type Item = {
  productId: string;
  quantity: string;
  unitCost: string;
  gstRate: string;
};

function money(paise: number) {
  return `₹${(
    Number(paise || 0) / 100
  ).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PurchasesPage() {
  const [
    suppliers,
    setSuppliers,
  ] = useState<Supplier[]>([]);

  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);

  const [
    purchases,
    setPurchases,
  ] = useState<Purchase[]>([]);

  const [
    supplierId,
    setSupplierId,
  ] = useState("");

  const [
    deliveryPaise,
    setDeliveryPaise,
  ] = useState("0");

  const [
    paymentAmountPaise,
    setPaymentAmountPaise,
  ] = useState("0");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("BANK_TRANSFER");

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [items, setItems] =
    useState<Item[]>([
      {
        productId: "",
        quantity: "1",
        unitCost: "0",
        gstRate: "0",
      },
    ]);

  const estimated = useMemo(() => {
    let subtotal = 0;
    let gst = 0;

    for (const item of items) {
      const quantity =
        Number(item.quantity || 0);

      const unitCost =
        Number(
          item.unitCost || 0
        );

      const rate =
        Number(
          item.gstRate || 0
        );

      const line =
        Math.round(
          quantity *
            unitCost *
            100
        );

      subtotal += line;

      gst += Math.round(
        line *
          (rate / 100)
      );
    }

    const delivery =
      Math.max(
        0,
        Number(
          deliveryPaise || 0
        )
      );

    return subtotal + gst + delivery;
  }, [
    items,
    deliveryPaise,
  ]);

  async function load() {
    setError("");

    try {
      const [
        supplierResponse,
        productResponse,
        purchaseResponse,
      ] = await Promise.all([
        fetch(
          "/api/admin/suppliers",
          {
            credentials:
              "include",
          }
        ),
        fetch(
          "/api/admin/products",
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

      const supplierData =
        await supplierResponse.json();

      const productData =
        await productResponse.json();

      const purchaseData =
        await purchaseResponse.json();

      if (
        !supplierResponse.ok ||
        !supplierData.success
      ) {
        throw new Error(
          supplierData.message ||
            "Unable to load suppliers."
        );
      }

      if (
        !productResponse.ok ||
        !productData.success
      ) {
        throw new Error(
          productData.message ||
            "Unable to load products."
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

      setSuppliers(
        supplierData.suppliers
      );

      setProducts(
        productData.products
      );

      setPurchases(
        purchaseData.purchases
      );

      if (
        !supplierId &&
        supplierData.suppliers.length
      ) {
        setSupplierId(
          supplierData.suppliers[0].id
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load purchase data."
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateItem(
    index: number,
    field: keyof Item,
    value: string
  ) {
    setItems((current) =>
      current.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]:
                  value,
              }
            : item
      )
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        productId: "",
        quantity: "1",
        unitCost: "0",
        gstRate: "0",
      },
    ]);
  }

  function removeItem(
    index: number
  ) {
    setItems((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  }

  async function submit(
    event: FormEvent
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        supplierId,
        deliveryPaise:
          Number(
            deliveryPaise || 0
          ),
        paymentAmountPaise:
          Number(
            paymentAmountPaise || 0
          ),
        paymentMethod,
        items: items.map(
          (item) => ({
            productId:
              item.productId,
            quantity:
              Number(
                item.quantity
              ),
            unitCostPaise:
              Math.round(
                Number(
                  item.unitCost
                ) * 100
              ),
            gstRate:
              Number(
                item.gstRate || 0
              ),
          })
        ),
      };

      const response =
        await fetch(
          "/api/admin/purchases",
          {
            method: "POST",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                payload
              ),
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
            "Purchase creation failed."
        );
      }

      setMessage(
        `Purchase ${data.purchase.purchaseNumber} created successfully.`
      );

      setDeliveryPaise("0");
      setPaymentAmountPaise("0");

      setItems([
        {
          productId: "",
          quantity: "1",
          unitCost: "0",
          gstRate: "0",
        },
      ]);

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Purchase creation failed."
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelPurchase(
    id: string
  ) {
    const reason =
      window.prompt(
        "Enter purchase cancellation reason:"
      );

    if (!reason?.trim()) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/admin/purchases/${id}/cancel`,
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
            "Purchase cancellation failed."
        );
      }

      setMessage(
        "Purchase cancelled and stock reversal recorded."
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Purchase cancellation failed."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <BusinessNav />

      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Purchases
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Purchase receipt → stock IN → GST
              → supplier payment → ledger.
            </p>
          </div>

          <div className="rounded-xl bg-white border px-4 py-3 text-sm">
            Estimated Total:
            <span className="ml-2 font-bold">
              {money(estimated)}
            </span>
          </div>
        </div>

        {message ? (
          <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[520px_1fr]">
          <form
            onSubmit={submit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-medium">
                Supplier
              </label>

              <select
                value={supplierId}
                onChange={(e) =>
                  setSupplierId(
                    e.target.value
                  )
                }
                required
                className="w-full rounded-xl border px-4 py-3"
              >
                <option value="">
                  Select supplier
                </option>

                {suppliers.map(
                  (supplier) => (
                    <option
                      key={
                        supplier.id
                      }
                      value={
                        supplier.id
                      }
                    >
                      {
                        supplier.name
                      }{" "}
                      ({
                        supplier.supplierCode
                      })
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="space-y-4">
              {items.map(
                (item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-semibold">
                        Item {index + 1}
                      </span>

                      {items.length >
                      1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            removeItem(
                              index
                            )
                          }
                          className="text-sm text-red-600"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <select
                        value={
                          item.productId
                        }
                        onChange={(e) =>
                          updateItem(
                            index,
                            "productId",
                            e.target.value
                          )
                        }
                        required
                        className="w-full rounded-xl border px-4 py-3"
                      >
                        <option value="">
                          Select product
                        </option>

                        {products.map(
                          (
                            product
                          ) => (
                            <option
                              key={
                                product.id
                              }
                              value={
                                product.id
                              }
                            >
                              {
                                product.name
                              }{" "}
                              — stock{" "}
                              {
                                product.stock
                              }
                            </option>
                          )
                        )}
                      </select>

                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          min="1"
                          value={
                            item.quantity
                          }
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantity",
                              e.target.value
                            )
                          }
                          placeholder="Qty"
                          className="rounded-xl border px-3 py-3"
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            item.unitCost
                          }
                          onChange={(e) =>
                            updateItem(
                              index,
                              "unitCost",
                              e.target.value
                            )
                          }
                          placeholder="Unit Cost"
                          className="rounded-xl border px-3 py-3"
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            item.gstRate
                          }
                          onChange={(e) =>
                            updateItem(
                              index,
                              "gstRate",
                              e.target.value
                            )
                          }
                          placeholder="GST %"
                          className="rounded-xl border px-3 py-3"
                        />
                      </div>
                    </div>
                  </div>
                )
              )}

              <button
                type="button"
                onClick={addItem}
                className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium w-full"
              >
                + Add Purchase Item
              </button>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Delivery (paise)
              </label>

              <input
                type="number"
                min="0"
                value={
                  deliveryPaise
                }
                onChange={(e) =>
                  setDeliveryPaise(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0"
                value={
                  paymentAmountPaise
                }
                onChange={(e) =>
                  setPaymentAmountPaise(
                    e.target.value
                  )
                }
                placeholder="Payment amount in paise"
                className="rounded-xl border px-4 py-3"
              />

              <select
                value={
                  paymentMethod
                }
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value
                  )
                }
                className="rounded-xl border px-4 py-3"
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
              </select>
            </div>

            <button
              type="submit"
              disabled={
                saving ||
                !supplierId ||
                items.length ===
                  0
              }
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving
                ? "Creating..."
                : "Create Purchase"}
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b p-5 font-semibold">
              Purchase History
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-left">
                      Purchase
                    </th>
                    <th className="p-3 text-left">
                      Total
                    </th>
                    <th className="p-3 text-left">
                      Payment
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
                  {purchases.map(
                    (purchase) => (
                      <tr
                        key={
                          purchase.id
                        }
                        className="border-t"
                      >
                        <td className="p-3 font-medium">
                          {
                            purchase.purchaseNumber
                          }
                        </td>

                        <td className="p-3">
                          {money(
                            purchase.totalPaise
                          )}
                        </td>

                        <td className="p-3">
                          {
                            purchase.paymentStatus
                          }
                        </td>

                        <td className="p-3">
                          {
                            purchase.status
                          }
                        </td>

                        <td className="p-3">
                          {purchase.status !==
                          "CANCELLED" ? (
                            <button
                              type="button"
                              onClick={() =>
                                cancelPurchase(
                                  purchase.id
                                )
                              }
                              className="text-red-600 text-sm"
                            >
                              Cancel
                            </button>
                          ) : (
                            <span className="text-slate-400">
                              Cancelled
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
        </div>
      </div>
    </main>
  );
}