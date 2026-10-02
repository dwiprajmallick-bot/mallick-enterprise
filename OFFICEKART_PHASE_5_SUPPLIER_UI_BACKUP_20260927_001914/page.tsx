"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import BusinessNav from "../_components/BusinessNav";

type Supplier = {
  id: string;
  supplierCode: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] =
    useState<Supplier[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [
    supplierCode,
    setSupplierCode,
  ] = useState("");

  const [name, setName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [gstin, setGstin] =
    useState("");

  const [address, setAddress] =
    useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/suppliers",
          {
            credentials:
              "include",
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
            "Unable to load suppliers."
        );
      }

      setSuppliers(
        data.suppliers
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load suppliers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(
    event: FormEvent
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/suppliers",
          {
            method: "POST",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              supplierCode,
              name,
              phone,
              email,
              gstin,
              address,
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
            "Supplier creation failed."
        );
      }

      setSupplierCode("");
      setName("");
      setPhone("");
      setEmail("");
      setGstin("");
      setAddress("");

      setMessage(
        "Supplier created successfully."
      );

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Supplier creation failed."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <BusinessNav />

      <div className="mx-auto max-w-7xl p-6">
        <h1 className="text-3xl font-bold">
          Suppliers
        </h1>

        <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          <form
            onSubmit={submit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
          >
            <h2 className="text-xl font-semibold">
              Add Supplier
            </h2>

            <input
              value={supplierCode}
              onChange={(e) =>
                setSupplierCode(
                  e.target.value
                )
              }
              placeholder="Supplier Code"
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              placeholder="Supplier Name"
              required
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              value={phone}
              onChange={(e) =>
                setPhone(
                  e.target.value
                )
              }
              placeholder="Phone"
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              placeholder="Email"
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              value={gstin}
              onChange={(e) =>
                setGstin(
                  e.target.value
                )
              }
              placeholder="GSTIN"
              className="w-full rounded-xl border px-4 py-3"
            />

            <textarea
              value={address}
              onChange={(e) =>
                setAddress(
                  e.target.value
                )
              }
              placeholder="Address"
              rows={4}
              className="w-full rounded-xl border px-4 py-3"
            />

            {message ? (
              <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Create Supplier"}
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b p-5 font-semibold">
              Supplier List
            </div>

            {loading ? (
              <div className="p-5 text-sm text-slate-500">
                Loading...
              </div>
            ) : suppliers.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">
                No suppliers found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 text-left">
                        Code
                      </th>
                      <th className="p-3 text-left">
                        Name
                      </th>
                      <th className="p-3 text-left">
                        Phone
                      </th>
                      <th className="p-3 text-left">
                        GSTIN
                      </th>
                      <th className="p-3 text-left">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {suppliers.map(
                      (supplier) => (
                        <tr
                          key={
                            supplier.id
                          }
                          className="border-t"
                        >
                          <td className="p-3">
                            {
                              supplier.supplierCode
                            }
                          </td>

                          <td className="p-3 font-medium">
                            {
                              supplier.name
                            }
                          </td>

                          <td className="p-3">
                            {
                              supplier.phone ||
                              "-"
                            }
                          </td>

                          <td className="p-3">
                            {
                              supplier.gstin ||
                              "-"
                            }
                          </td>

                          <td className="p-3">
                            {
                              supplier.status
                            }
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}