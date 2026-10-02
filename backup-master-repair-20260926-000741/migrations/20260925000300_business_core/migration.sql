CREATE TABLE IF NOT EXISTS "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_supplierCode_key"
ON "Supplier"("supplierCode");

CREATE INDEX IF NOT EXISTS "Supplier_name_idx"
ON "Supplier"("name");

CREATE INDEX IF NOT EXISTS "Supplier_phone_idx"
ON "Supplier"("phone");

CREATE INDEX IF NOT EXISTS "Supplier_gstin_idx"
ON "Supplier"("gstin");

CREATE INDEX IF NOT EXISTS "Supplier_status_idx"
ON "Supplier"("status");

CREATE INDEX IF NOT EXISTS "Supplier_createdAt_idx"
ON "Supplier"("createdAt");


CREATE TABLE IF NOT EXISTS "Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "subtotalPaise" INTEGER NOT NULL,
    "gstPaise" INTEGER NOT NULL DEFAULT 0,
    "deliveryPaise" INTEGER NOT NULL DEFAULT 0,
    "totalPaise" INTEGER NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Purchase_purchaseNumber_key"
ON "Purchase"("purchaseNumber");

CREATE INDEX IF NOT EXISTS "Purchase_supplierId_idx"
ON "Purchase"("supplierId");

CREATE INDEX IF NOT EXISTS "Purchase_status_idx"
ON "Purchase"("status");

CREATE INDEX IF NOT EXISTS "Purchase_paymentStatus_idx"
ON "Purchase"("paymentStatus");

CREATE INDEX IF NOT EXISTS "Purchase_purchasedAt_idx"
ON "Purchase"("purchasedAt");

CREATE INDEX IF NOT EXISTS "Purchase_createdAt_idx"
ON "Purchase"("createdAt");


CREATE TABLE IF NOT EXISTS "PurchaseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCostPaise" INTEGER NOT NULL,
    "gstRate" REAL NOT NULL DEFAULT 0,
    "gstPaise" INTEGER NOT NULL DEFAULT 0,
    "lineTotalPaise" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PurchaseItem_purchaseId_idx"
ON "PurchaseItem"("purchaseId");

CREATE INDEX IF NOT EXISTS "PurchaseItem_productId_idx"
ON "PurchaseItem"("productId");

CREATE INDEX IF NOT EXISTS "PurchaseItem_createdAt_idx"
ON "PurchaseItem"("createdAt");


CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "subtotalPaise" INTEGER NOT NULL,
    "gstPaise" INTEGER NOT NULL DEFAULT 0,
    "deliveryPaise" INTEGER NOT NULL DEFAULT 0,
    "totalPaise" INTEGER NOT NULL,
    "gstRate" REAL NOT NULL DEFAULT 0,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNumber_key"
ON "Invoice"("invoiceNumber");

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_orderId_key"
ON "Invoice"("orderId");

CREATE INDEX IF NOT EXISTS "Invoice_customerId_idx"
ON "Invoice"("customerId");

CREATE INDEX IF NOT EXISTS "Invoice_status_idx"
ON "Invoice"("status");

CREATE INDEX IF NOT EXISTS "Invoice_paymentStatus_idx"
ON "Invoice"("paymentStatus");

CREATE INDEX IF NOT EXISTS "Invoice_issuedAt_idx"
ON "Invoice"("issuedAt");

CREATE INDEX IF NOT EXISTS "Invoice_createdAt_idx"
ON "Invoice"("createdAt");


CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "orderId" TEXT,
    "purchaseId" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_paymentNumber_key"
ON "Payment"("paymentNumber");

CREATE INDEX IF NOT EXISTS "Payment_type_idx"
ON "Payment"("type");

CREATE INDEX IF NOT EXISTS "Payment_status_idx"
ON "Payment"("status");

CREATE INDEX IF NOT EXISTS "Payment_orderId_idx"
ON "Payment"("orderId");

CREATE INDEX IF NOT EXISTS "Payment_purchaseId_idx"
ON "Payment"("purchaseId");

CREATE INDEX IF NOT EXISTS "Payment_paidAt_idx"
ON "Payment"("paidAt");

CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx"
ON "Payment"("createdAt");


CREATE TABLE IF NOT EXISTS "LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ledgerNumber" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "accountId" TEXT,
    "orderId" TEXT,
    "purchaseId" TEXT,
    "paymentId" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "transactionAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "LedgerEntry_ledgerNumber_key"
ON "LedgerEntry"("ledgerNumber");

CREATE INDEX IF NOT EXISTS "LedgerEntry_entryType_idx"
ON "LedgerEntry"("entryType");

CREATE INDEX IF NOT EXISTS "LedgerEntry_accountType_idx"
ON "LedgerEntry"("accountType");

CREATE INDEX IF NOT EXISTS "LedgerEntry_accountId_idx"
ON "LedgerEntry"("accountId");

CREATE INDEX IF NOT EXISTS "LedgerEntry_orderId_idx"
ON "LedgerEntry"("orderId");

CREATE INDEX IF NOT EXISTS "LedgerEntry_purchaseId_idx"
ON "LedgerEntry"("purchaseId");

CREATE INDEX IF NOT EXISTS "LedgerEntry_paymentId_idx"
ON "LedgerEntry"("paymentId");

CREATE INDEX IF NOT EXISTS "LedgerEntry_referenceType_referenceId_idx"
ON "LedgerEntry"("referenceType", "referenceId");

CREATE INDEX IF NOT EXISTS "LedgerEntry_transactionAt_idx"
ON "LedgerEntry"("transactionAt");

CREATE INDEX IF NOT EXISTS "LedgerEntry_createdAt_idx"
ON "LedgerEntry"("createdAt");


CREATE TABLE IF NOT EXISTS "GstRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gstNumber" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "gstRate" REAL NOT NULL DEFAULT 0,
    "taxablePaise" INTEGER NOT NULL,
    "gstPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "GstRecord_gstNumber_key"
ON "GstRecord"("gstNumber");

CREATE INDEX IF NOT EXISTS "GstRecord_entryType_idx"
ON "GstRecord"("entryType");

CREATE INDEX IF NOT EXISTS "GstRecord_sourceType_idx"
ON "GstRecord"("sourceType");

CREATE INDEX IF NOT EXISTS "GstRecord_sourceId_idx"
ON "GstRecord"("sourceId");

CREATE INDEX IF NOT EXISTS "GstRecord_status_idx"
ON "GstRecord"("status");

CREATE INDEX IF NOT EXISTS "GstRecord_createdAt_idx"
ON "GstRecord"("createdAt");


CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentNumber" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "uploadedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Document_documentNumber_key"
ON "Document"("documentNumber");

CREATE INDEX IF NOT EXISTS "Document_entityType_entityId_idx"
ON "Document"("entityType", "entityId");

CREATE INDEX IF NOT EXISTS "Document_documentType_idx"
ON "Document"("documentType");

CREATE INDEX IF NOT EXISTS "Document_checksum_idx"
ON "Document"("checksum");

CREATE INDEX IF NOT EXISTS "Document_version_idx"
ON "Document"("version");

CREATE INDEX IF NOT EXISTS "Document_createdAt_idx"
ON "Document"("createdAt");


CREATE TRIGGER IF NOT EXISTS "LedgerEntry_prevent_update"
BEFORE UPDATE ON "LedgerEntry"
BEGIN
    SELECT RAISE(ABORT, 'LedgerEntry is append-only. Use correction or reversal entry.');
END;

CREATE TRIGGER IF NOT EXISTS "LedgerEntry_prevent_delete"
BEFORE DELETE ON "LedgerEntry"
BEGIN
    SELECT RAISE(ABORT, 'LedgerEntry cannot be deleted. Use reversal entry.');
END;

CREATE TRIGGER IF NOT EXISTS "Payment_prevent_update"
BEFORE UPDATE ON "Payment"
BEGIN
    SELECT RAISE(ABORT, 'Payment is immutable. Use reversal or correction.');
END;

CREATE TRIGGER IF NOT EXISTS "Payment_prevent_delete"
BEFORE DELETE ON "Payment"
BEGIN
    SELECT RAISE(ABORT, 'Payment cannot be deleted. Use reversal or correction.');
END;

CREATE TRIGGER IF NOT EXISTS "Document_prevent_update"
BEFORE UPDATE ON "Document"
BEGIN
    SELECT RAISE(ABORT, 'Documents are versioned. Create a new version instead.');
END;

CREATE TRIGGER IF NOT EXISTS "Document_prevent_delete"
BEFORE DELETE ON "Document"
BEGIN
    SELECT RAISE(ABORT, 'Documents cannot be deleted. Create a new version or status record.');
END;