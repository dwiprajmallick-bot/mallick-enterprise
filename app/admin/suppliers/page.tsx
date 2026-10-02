"use client";

import { FormEvent, useEffect, useState } from "react";

type Supplier = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  pan?: string | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type SupplierForm = {
  name: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

const emptyForm: SupplierForm = {
  name: "",
  phone: "",
  email: "",
  gstin: "",
  pan: "",
  address: "",
  city: "",
  state: "West Bengal",
  pincode: "",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);

  async function loadSuppliers() {
    try {
      setLoading(true);

      const response = await fetch("/api/admin/suppliers", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load suppliers.");
      }

      const rows = Array.isArray(data.suppliers)
        ? data.suppliers
        : Array.isArray(data.data)
          ? data.data
          : [];

      setSuppliers(rows);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load suppliers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  function updateField(
    field: keyof SupplierForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setShowForm(true);
  }

  function startEdit(supplier: Supplier) {
    setEditingId(supplier.id);

    setForm({
      name: supplier.name || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      gstin: supplier.gstin || "",
      pan: supplier.pan || "",
      address: supplier.address || "",
      city: supplier.city || "",
      state: supplier.state || "",
      pincode: supplier.pincode || "",
    });

    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setMessage("Supplier name is required.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const endpoint = editingId
        ? `/api/admin/suppliers/${editingId}`
        : "/api/admin/suppliers";

      const response = await fetch(endpoint, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          gstin: form.gstin.trim().toUpperCase(),
          pan: form.pan.trim().toUpperCase(),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            (editingId
              ? "Supplier update failed."
              : "Supplier creation failed.")
        );
      }

      setMessage(
        editingId
          ? "Supplier updated successfully."
          : "Supplier created successfully."
      );

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadSuppliers();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Supplier operation failed."
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredSuppliers = suppliers.filter((supplier) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return [
      supplier.name,
      supplier.phone,
      supplier.email,
      supplier.gstin,
      supplier.pan,
      supplier.city,
      supplier.state,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(query)
      );
  });

  const activeCount = suppliers.filter(
    (supplier) =>
      String(supplier.status || "ACTIVE").toUpperCase() ===
      "ACTIVE"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <header className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              দ্বীবরাজ মল্লিক • OfficeKart
            </p>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              Supplier Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage suppliers, GST details and procurement partners.
            </p>
          </div>

          <button
            type="button"
            onClick={startAdd}
            className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            + Add Supplier
          </button>
        </header>

        {message && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-800">
            {message}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Total Suppliers
            </p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {suppliers.length}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Active Suppliers
            </p>
            <p className="mt-2 text-3xl font-extrabold text-green-700">
              {activeCount}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Showing
            </p>
            <p className="mt-2 text-3xl font-extrabold text-blue-700">
              {filteredSuppliers.length}
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Suppliers
              </h2>
              <p className="text-sm text-slate-500">
                Search by name, phone, GSTIN, PAN or location.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search suppliers..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 md:w-96"
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              Loading suppliers...
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-extrabold text-slate-800">
                No suppliers found
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Add your first supplier to start procurement management.
              </p>

              <button
                type="button"
                onClick={startAdd}
                className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
              >
                + Add Supplier
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Supplier
                    </th>
                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Contact
                    </th>
                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      GSTIN
                    </th>
                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Location
                    </th>
                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredSuppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-5">
                        <p className="font-extrabold text-slate-900">
                          {supplier.name}
                        </p>

                        {supplier.pan && (
                          <p className="mt-1 text-xs text-slate-500">
                            PAN: {supplier.pan}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <p className="text-sm font-semibold text-slate-700">
                          {supplier.phone || "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {supplier.email || "No email"}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                          {supplier.gstin || "UNREGISTERED"}
                        </span>
                      </td>

                      <td className="px-5 py-5 text-sm text-slate-600">
                        {[supplier.city, supplier.state]
                          .filter(Boolean)
                          .join(", ") || "—"}

                        {supplier.pincode && (
                          <span className="ml-1">
                            - {supplier.pincode}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`rounded-xl px-3 py-2 text-xs font-extrabold ${
                            String(
                              supplier.status || "ACTIVE"
                            ).toUpperCase() === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {String(
                            supplier.status || "ACTIVE"
                          ).toUpperCase()}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <button
                          type="button"
                          onClick={() => startEdit(supplier)}
                          className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    {editingId
                      ? "Edit Supplier"
                      : "Add Supplier"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Supplier master information
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
                >
                  Close
                </button>
              </div>

              <form
                onSubmit={submitForm}
                className="space-y-6 p-6"
              >
                <section>
                  <h3 className="mb-4 text-lg font-extrabold text-slate-900">
                    Basic Information
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Supplier Name *
                      </label>

                      <input
                        required
                        value={form.name}
                        onChange={(event) =>
                          updateField(
                            "name",
                            event.target.value
                          )
                        }
                        placeholder="Supplier / Company Name"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Phone
                      </label>

                      <input
                        value={form.phone}
                        onChange={(event) =>
                          updateField(
                            "phone",
                            event.target.value
                          )
                        }
                        placeholder="Phone number"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Email
                      </label>

                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          updateField(
                            "email",
                            event.target.value
                          )
                        }
                        placeholder="supplier@example.com"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-lg font-extrabold text-slate-900">
                    Tax Information
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        GSTIN
                      </label>

                      <input
                        value={form.gstin}
                        onChange={(event) =>
                          updateField(
                            "gstin",
                            event.target.value
                          )
                        }
                        placeholder="GSTIN"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 uppercase outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        PAN
                      </label>

                      <input
                        value={form.pan}
                        onChange={(event) =>
                          updateField(
                            "pan",
                            event.target.value
                          )
                        }
                        placeholder="PAN"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 uppercase outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="mb-4 text-lg font-extrabold text-slate-900">
                    Address
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Address
                      </label>

                      <textarea
                        value={form.address}
                        onChange={(event) =>
                          updateField(
                            "address",
                            event.target.value
                          )
                        }
                        placeholder="Full supplier address"
                        rows={3}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        City
                      </label>

                      <input
                        value={form.city}
                        onChange={(event) =>
                          updateField(
                            "city",
                            event.target.value
                          )
                        }
                        placeholder="City"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        State
                      </label>

                      <input
                        value={form.state}
                        onChange={(event) =>
                          updateField(
                            "state",
                            event.target.value
                          )
                        }
                        placeholder="State"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Pincode
                      </label>

                      <input
                        value={form.pincode}
                        onChange={(event) =>
                          updateField(
                            "pincode",
                            event.target.value
                          )
                        }
                        placeholder="Pincode"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </section>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 md:flex-row md:justify-end">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-blue-600 px-7 py-3 text-sm font-extrabold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                        ? "Update Supplier"
                        : "Create Supplier"}
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
