"use client";

import {
  useEffect,
  useState,
} from "react";

import BusinessNav from "../_components/BusinessNav";

type Entry = {
  id: string;
  ledgerNumber: string;
  entryType: string;
  accountType: string;
  accountId: string | null;
  amountPaise: number;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  transactionAt: string;
};

function money(
  paise: number
) {
  return `₹${(
    Number(paise || 0) / 100
  ).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function LedgerPage() {
  const [
    entries,
    setEntries,
  ] = useState<Entry[]>([]);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response =
          await fetch(
            "/api/admin/ledger",
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
              "Unable to load ledger."
          );
        }

        setEntries(
          data.entries
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load ledger."
        );
      }
    }

    load();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100">
      <BusinessNav />

      <div className="mx-auto max-w-7xl p-6">
        <h1 className="text-3xl font-bold">
          Ledger
        </h1>

        {error ? (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left">
                  Number
                </th>
                <th className="p-3 text-left">
                  Entry
                </th>
                <th className="p-3 text-left">
                  Account
                </th>
                <th className="p-3 text-left">
                  Amount
                </th>
                <th className="p-3 text-left">
                  Description
                </th>
                <th className="p-3 text-left">
                  Reference
                </th>
              </tr>
            </thead>

            <tbody>
              {entries.map(
                (entry) => (
                  <tr
                    key={
                      entry.id
                    }
                    className="border-t"
                  >
                    <td className="p-3 font-medium">
                      {
                        entry.ledgerNumber
                      }
                    </td>

                    <td className="p-3">
                      {
                        entry.entryType
                      }
                    </td>

                    <td className="p-3">
                      {
                        entry.accountType
                      }
                    </td>

                    <td className="p-3">
                      {money(
                        entry.amountPaise
                      )}
                    </td>

                    <td className="p-3">
                      {
                        entry.description
                      }
                    </td>

                    <td className="p-3">
                      {entry.referenceType
                        ? `${entry.referenceType} / ${entry.referenceId || ""}`
                        : "-"}
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