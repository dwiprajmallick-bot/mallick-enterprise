"use client";

import { useEffect, useMemo, useState } from "react";

type Account = {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  bankName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  upiId: string | null;
  openingBalancePaise: number;
  currentBalancePaise: number;
  status: string;
};

type Transaction = {
  id: string;
  transactionNumber: string;
  transactionType: string;
  amountPaise: number;
  paymentMethod: string;
  transactionDate: string;
  referenceNumber: string | null;
  direction: string;
  status: string;
  description: string | null;
};

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((paise || 0) / 100);

export default function CashBankAccountsPage() {

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [selected, setSelected] =
    useState<Account | null>(null);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [accountName, setAccountName] =
    useState("");

  const [accountType, setAccountType] =
    useState("CASH");

  const [bankName, setBankName] =
    useState("");

  const [accountNumber, setAccountNumber] =
    useState("");

  const [ifscCode, setIfscCode] =
    useState("");

  const [upiId, setUpiId] =
    useState("");

  const [openingBalance, setOpeningBalance] =
    useState("");

  const [txAmount, setTxAmount] =
    useState("");

  const [txDirection, setTxDirection] =
    useState("IN");

  const [txMethod, setTxMethod] =
    useState("CASH");

  const [txType, setTxType] =
    useState("MANUAL");

  const [txReference, setTxReference] =
    useState("");

  const [txDescription, setTxDescription] =
    useState("");

  async function loadAccounts() {

    try {

      const response =
        await fetch(
          "/api/admin/cash-bank-accounts",
          {
            cache: "no-store",
          }
        );

      const json =
        await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(
          json.error ||
            "Unable to load accounts."
        );
      }

      setAccounts(json.accounts);

    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : "Unable to load accounts."
      );
    }
  }

  async function openAccount(
    account: Account
  ) {

    setSelected(account);
    setError("");

    try {

      const response =
        await fetch(
          `/api/admin/cash-bank-accounts/${account.id}/transactions`,
          {
            cache: "no-store",
          }
        );

      const json =
        await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(
          json.error ||
            "Unable to load transactions."
        );
      }

      setSelected(json.account);
      setTransactions(
        json.transactions
      );

    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : "Unable to load transactions."
      );
    }
  }

  async function createAccount(
    event: React.FormEvent
  ) {

    event.preventDefault();

    setMessage("");
    setError("");

    try {

      const response =
        await fetch(
          "/api/admin/cash-bank-accounts",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              accountName,
              accountType,
              bankName,
              accountNumber,
              ifscCode,
              upiId,
              openingBalancePaise:
                Math.round(
                  Number(
                    openingBalance || 0
                  ) * 100
                ),
            }),
          }
        );

      const json =
        await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(
          json.error ||
            "Unable to create account."
        );
      }

      setMessage(
        "Account created successfully."
      );

      setAccountName("");
      setBankName("");
      setAccountNumber("");
      setIfscCode("");
      setUpiId("");
      setOpeningBalance("");

      await loadAccounts();

    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : "Unable to create account."
      );
    }
  }

  async function postTransaction(
    event: React.FormEvent
  ) {

    event.preventDefault();

    if (!selected) {
      setError(
        "Select an account first."
      );
      return;
    }

    setMessage("");
    setError("");

    try {

      const response =
        await fetch(
          `/api/admin/cash-bank-accounts/${selected.id}/transactions`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              amountPaise:
                Math.round(
                  Number(txAmount || 0) *
                    100
                ),
              direction: txDirection,
              paymentMethod: txMethod,
              transactionType: txType,
              referenceNumber:
                txReference,
              description:
                txDescription,
            }),
          }
        );

      const json =
        await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(
          json.error ||
            "Unable to post transaction."
        );
      }

      setMessage(
        "Account transaction posted successfully."
      );

      setTxAmount("");
      setTxReference("");
      setTxDescription("");

      await loadAccounts();
      await openAccount(
        json.updatedAccount
      );

    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : "Unable to post transaction."
      );
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  const totalBalance =
    useMemo(
      () =>
        accounts.reduce(
          (sum, account) =>
            sum +
            account.currentBalancePaise,
          0
        ),
      [accounts]
    );

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">

      <div className="mx-auto max-w-7xl space-y-6">

        <header className="rounded-3xl bg-slate-950 p-6 text-white">

          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
            OfficeKart
          </p>

          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

            <div>

              <h1 className="text-3xl font-black">
                Cash & Bank Accounts
              </h1>

              <p className="mt-2 text-sm text-slate-300">
                Cash, Bank, UPI and payment-method
                account management.
              </p>

            </div>

            <div className="rounded-2xl bg-slate-800 px-5 py-4">

              <p className="text-xs text-slate-400">
                Combined Balance
              </p>

              <p className="text-2xl font-black">
                {money(totalBalance)}
              </p>

            </div>

          </div>

        </header>

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[380px_1fr]">

          <form
            onSubmit={createAccount}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          >

            <h2 className="text-xl font-black">
              Add Account
            </h2>

            <div className="mt-5 space-y-3">

              <input
                required
                value={accountName}
                onChange={(e) =>
                  setAccountName(
                    e.target.value
                  )
                }
                placeholder="Account name"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />

              <select
                value={accountType}
                onChange={(e) =>
                  setAccountType(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              >
                <option value="CASH">
                  Cash
                </option>
                <option value="BANK">
                  Bank
                </option>
                <option value="UPI">
                  UPI
                </option>
                <option value="WALLET">
                  Wallet
                </option>
                <option value="OTHER">
                  Other
                </option>
              </select>

              <input
                value={bankName}
                onChange={(e) =>
                  setBankName(
                    e.target.value
                  )
                }
                placeholder="Bank name"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />

              <input
                value={accountNumber}
                onChange={(e) =>
                  setAccountNumber(
                    e.target.value
                  )
                }
                placeholder="Account number"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />

              <input
                value={ifscCode}
                onChange={(e) =>
                  setIfscCode(
                    e.target.value
                  )
                }
                placeholder="IFSC"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />

              <input
                value={upiId}
                onChange={(e) =>
                  setUpiId(
                    e.target.value
                  )
                }
                placeholder="UPI ID"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={(e) =>
                  setOpeningBalance(
                    e.target.value
                  )
                }
                placeholder="Opening balance ₹"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"
              >
                Create Account
              </button>

            </div>

          </form>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">

            <div>
              <h2 className="text-xl font-black">
                Account Register
              </h2>

              <p className="text-sm text-slate-500">
                {accounts.length} account(s)
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">

              {accounts.map(
                (account) => (

                  <button
                    key={account.id}
                    type="button"
                    onClick={() =>
                      openAccount(account)
                    }
                    className={`rounded-2xl border p-4 text-left ${
                      selected?.id ===
                      account.id
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >

                    <p className="text-xs font-bold uppercase tracking-wide opacity-60">
                      {account.accountType}
                    </p>

                    <h3 className="mt-1 font-black">
                      {account.accountName}
                    </h3>

                    <p className="mt-1 text-xs opacity-60">
                      {account.accountCode}
                    </p>

                    <p className="mt-4 text-2xl font-black">
                      {money(
                        account.currentBalancePaise
                      )}
                    </p>

                    {account.bankName && (
                      <p className="mt-1 text-xs opacity-70">
                        {account.bankName}
                      </p>
                    )}

                  </button>

                )
              )}

            </div>

            {accounts.length === 0 && (
              <div className="mt-5 rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                No cash or bank account created yet.
              </div>
            )}

          </section>

        </section>

        {selected && (

          <section className="grid gap-6 lg:grid-cols-[380px_1fr]">

            <form
              onSubmit={postTransaction}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >

              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Selected Account
              </p>

              <h2 className="mt-1 text-xl font-black">
                {selected.accountName}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Balance:{" "}
                <strong>
                  {money(
                    selected.currentBalancePaise
                  )}
                </strong>
              </p>

              <div className="mt-5 space-y-3">

                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={txAmount}
                  onChange={(e) =>
                    setTxAmount(
                      e.target.value
                    )
                  }
                  placeholder="Amount ₹"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                />

                <select
                  value={txDirection}
                  onChange={(e) =>
                    setTxDirection(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                >
                  <option value="IN">
                    Money In
                  </option>
                  <option value="OUT">
                    Money Out
                  </option>
                </select>

                <select
                  value={txMethod}
                  onChange={(e) =>
                    setTxMethod(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                >
                  <option value="CASH">
                    Cash
                  </option>
                  <option value="BANK_TRANSFER">
                    Bank Transfer
                  </option>
                  <option value="UPI">
                    UPI
                  </option>
                  <option value="NEFT">
                    NEFT
                  </option>
                  <option value="RTGS">
                    RTGS
                  </option>
                  <option value="IMPS">
                    IMPS
                  </option>
                  <option value="CHEQUE">
                    Cheque
                  </option>
                  <option value="CARD">
                    Card
                  </option>
                  <option value="OTHER">
                    Other
                  </option>
                </select>

                <select
                  value={txType}
                  onChange={(e) =>
                    setTxType(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                >
                  <option value="MANUAL">
                    Manual
                  </option>
                  <option value="CUSTOMER_RECEIPT">
                    Customer Receipt
                  </option>
                  <option value="SUPPLIER_PAYMENT">
                    Supplier Payment
                  </option>
                  <option value="REFUND">
                    Refund
                  </option>
                  <option value="TRANSFER">
                    Transfer
                  </option>
                  <option value="EXPENSE">
                    Expense
                  </option>
                  <option value="ADJUSTMENT">
                    Adjustment
                  </option>
                </select>

                <input
                  value={txReference}
                  onChange={(e) =>
                    setTxReference(
                      e.target.value
                    )
                  }
                  placeholder="Reference / transaction no."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                />

                <textarea
                  value={txDescription}
                  onChange={(e) =>
                    setTxDescription(
                      e.target.value
                    )
                  }
                  placeholder="Description"
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                />

                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"
                >
                  Post Account Transaction
                </button>

              </div>

            </form>

            <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">

              <div className="border-b border-slate-200 px-5 py-4">

                <h2 className="font-black">
                  Account Transaction Register
                </h2>

                <p className="text-xs text-slate-500">
                  {selected.accountCode}
                </p>

              </div>

              <div className="overflow-x-auto">

                <table className="min-w-full text-left text-sm">

                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                    <tr>
                      <th className="px-5 py-3">
                        Date
                      </th>
                      <th className="px-5 py-3">
                        Transaction
                      </th>
                      <th className="px-5 py-3">
                        Method
                      </th>
                      <th className="px-5 py-3">
                        Direction
                      </th>
                      <th className="px-5 py-3">
                        Amount
                      </th>
                      <th className="px-5 py-3">
                        Status
                      </th>
                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {transactions.map(
                      (tx) => (

                        <tr
                          key={tx.id}
                          className="hover:bg-slate-50"
                        >

                          <td className="px-5 py-4 text-slate-600">
                            {new Date(
                              tx.transactionDate
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </td>

                          <td className="px-5 py-4">

                            <div className="font-bold">
                              {tx.transactionNumber}
                            </div>

                            <div className="text-xs text-slate-400">
                              {tx.transactionType}
                            </div>

                            {tx.referenceNumber && (
                              <div className="text-xs text-slate-400">
                                Ref:{" "}
                                {tx.referenceNumber}
                              </div>
                            )}

                          </td>

                          <td className="px-5 py-4 font-semibold">
                            {tx.paymentMethod}
                          </td>

                          <td className="px-5 py-4">

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                tx.direction ===
                                "IN"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {tx.direction ===
                              "IN"
                                ? "Money In"
                                : "Money Out"}
                            </span>

                          </td>

                          <td className="px-5 py-4 font-black">
                            {money(
                              tx.amountPaise
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                              {tx.status}
                            </span>
                          </td>

                        </tr>

                      )
                    )}

                    {transactions.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-12 text-center text-sm text-slate-500"
                        >
                          No transactions recorded
                          for this account.
                        </td>
                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

            </section>

          </section>

        )}

      </div>

    </main>
  );
}