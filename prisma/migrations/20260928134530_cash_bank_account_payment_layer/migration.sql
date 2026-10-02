-- CreateTable
CREATE TABLE "CashBankAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "paymentMethods" TEXT,
    "bankName" TEXT,
    "branchName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "upiId" TEXT,
    "openingBalancePaise" INTEGER NOT NULL DEFAULT 0,
    "currentBalancePaise" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CashBankTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionNumber" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceNumber" TEXT,
    "externalReference" TEXT,
    "partyType" TEXT,
    "partyId" TEXT,
    "customerId" TEXT,
    "supplierId" TEXT,
    "orderId" TEXT,
    "purchaseId" TEXT,
    "paymentId" TEXT,
    "supplierPaymentId" TEXT,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "description" TEXT,
    "reversalOfId" TEXT,
    "reversedAt" DATETIME,
    "reversalReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CashBankAccount_accountCode_key" ON "CashBankAccount"("accountCode");

-- CreateIndex
CREATE INDEX "CashBankAccount_accountType_idx" ON "CashBankAccount"("accountType");

-- CreateIndex
CREATE INDEX "CashBankAccount_status_idx" ON "CashBankAccount"("status");

-- CreateIndex
CREATE INDEX "CashBankAccount_createdAt_idx" ON "CashBankAccount"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CashBankTransaction_transactionNumber_key" ON "CashBankTransaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "CashBankTransaction_accountId_idx" ON "CashBankTransaction"("accountId");

-- CreateIndex
CREATE INDEX "CashBankTransaction_transactionDate_idx" ON "CashBankTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "CashBankTransaction_transactionType_idx" ON "CashBankTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "CashBankTransaction_paymentMethod_idx" ON "CashBankTransaction"("paymentMethod");

-- CreateIndex
CREATE INDEX "CashBankTransaction_status_idx" ON "CashBankTransaction"("status");

-- CreateIndex
CREATE INDEX "CashBankTransaction_customerId_idx" ON "CashBankTransaction"("customerId");

-- CreateIndex
CREATE INDEX "CashBankTransaction_supplierId_idx" ON "CashBankTransaction"("supplierId");

-- CreateIndex
CREATE INDEX "CashBankTransaction_orderId_idx" ON "CashBankTransaction"("orderId");

-- CreateIndex
CREATE INDEX "CashBankTransaction_purchaseId_idx" ON "CashBankTransaction"("purchaseId");

-- CreateIndex
CREATE INDEX "CashBankTransaction_paymentId_idx" ON "CashBankTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "CashBankTransaction_supplierPaymentId_idx" ON "CashBankTransaction"("supplierPaymentId");

-- CreateIndex
CREATE INDEX "CashBankTransaction_reversalOfId_idx" ON "CashBankTransaction"("reversalOfId");
