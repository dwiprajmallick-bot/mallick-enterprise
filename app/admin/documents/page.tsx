"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import BusinessNav from "../_components/BusinessNav";

type DocumentRecord = {
  id: string;
  documentNumber: string;
  entityType: string;
  entityId: string;
  documentType: string;
  fileName: string;
  version: number;
  status: string;
  fileSize: number;
  checksum: string;
  createdAt: string;
};

export default function DocumentsPage() {
  const [
    documents,
    setDocuments,
  ] = useState<DocumentRecord[]>([]);

  const [
    entityType,
    setEntityType,
  ] = useState("Supplier");

  const [
    entityId,
    setEntityId,
  ] = useState("");

  const [
    documentType,
    setDocumentType,
  ] = useState("SUPPLIER_DOCUMENT");

  const [
    file,
    setFile,
  ] = useState<File | null>(
    null
  );

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

  async function load() {
    try {
      const response =
        await fetch(
          "/api/admin/documents",
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
            "Unable to load documents."
        );
      }

      setDocuments(
        data.documents
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load documents."
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

    setSaving(true);
    setError("");
    setMessage("");

    if (
      !entityId.trim() ||
      !file
    ) {
      setError(
        "Entity ID and file are required."
      );
      setSaving(false);
      return;
    }

    try {
      const formData =
        new FormData();

      formData.append(
        "entityType",
        entityType
      );

      formData.append(
        "entityId",
        entityId.trim()
      );

      formData.append(
        "documentType",
        documentType
      );

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/admin/documents",
          {
            method: "POST",
            credentials:
              "include",
            body: formData,
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
            "Document upload failed."
        );
      }

      setMessage(
        `Document ${data.document.documentNumber} version ${data.document.version} uploaded.`
      );

      setEntityId("");
      setFile(null);

      const input =
        document.getElementById(
          "business-document-file"
        ) as HTMLInputElement |
          null;

      if (input) {
        input.value = "";
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Document upload failed."
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
          Documents
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
          <div className="grid gap-4 md:grid-cols-4">
            <select
              value={
                entityType
              }
              onChange={(e) =>
                setEntityType(
                  e.target.value
                )
              }
              className="rounded-xl border px-4 py-3"
            >
              <option value="Supplier">
                Supplier
              </option>
              <option value="Purchase">
                Purchase
              </option>
              <option value="Order">
                Order
              </option>
              <option value="Invoice">
                Invoice
              </option>
              <option value="Customer">
                Customer
              </option>
              <option value="Product">
                Product
              </option>
            </select>

            <input
              value={
                entityId
              }
              onChange={(e) =>
                setEntityId(
                  e.target.value
                )
              }
              placeholder="Entity ID"
              className="rounded-xl border px-4 py-3"
              required
            />

            <input
              value={
                documentType
              }
              onChange={(e) =>
                setDocumentType(
                  e.target.value
                )
              }
              placeholder="Document Type"
              className="rounded-xl border px-4 py-3"
              required
            />

            <input
              id="business-document-file"
              type="file"
              onChange={(e) =>
                setFile(
                  e.target.files?.[0] ||
                    null
                )
              }
              className="rounded-xl border px-4 py-3"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {saving
              ? "Uploading..."
              : "Upload Document"}
          </button>
        </form>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left">
                  Number
                </th>
                <th className="p-3 text-left">
                  Entity
                </th>
                <th className="p-3 text-left">
                  Type
                </th>
                <th className="p-3 text-left">
                  File
                </th>
                <th className="p-3 text-left">
                  Version
                </th>
                <th className="p-3 text-left">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {documents.map(
                (doc) => (
                  <tr
                    key={doc.id}
                    className="border-t"
                  >
                    <td className="p-3 font-medium">
                      {
                        doc.documentNumber
                      }
                    </td>

                    <td className="p-3">
                      {
                        doc.entityType
                      }{" "}
                      /{" "}
                      {
                        doc.entityId
                      }
                    </td>

                    <td className="p-3">
                      {
                        doc.documentType
                      }
                    </td>

                    <td className="p-3">
                      {
                        doc.fileName
                      }
                    </td>

                    <td className="p-3">
                      {doc.version}
                    </td>

                    <td className="p-3">
                      <a
                        href={`/api/admin/documents/${doc.id}/download`}
                        className="text-blue-600"
                      >
                        Download
                      </a>
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