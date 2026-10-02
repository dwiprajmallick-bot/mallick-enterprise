export const CASH_BANK_ACCOUNT_TYPES = [
  "CASH",
  "BANK",
  "UPI",
  "WALLET",
  "OTHER",
] as const;

export const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "UPI",
  "NEFT",
  "RTGS",
  "IMPS",
  "CHEQUE",
  "CARD",
  "OTHER",
] as const;

export function makeAccountCode() {
  return `ACC-${Date.now().toString(36).toUpperCase()}`;
}

export function makeTransactionNumber() {
  return `CBT-${Date.now().toString(36).toUpperCase()}`;
}