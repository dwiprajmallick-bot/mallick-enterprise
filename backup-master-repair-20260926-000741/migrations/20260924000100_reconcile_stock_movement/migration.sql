-- Reconciliation migration.
-- StockMovement already exists in the database.
-- This migration is intentionally marked as applied without execution.
-- Do not execute this SQL against the current database.

CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "note" TEXT,
    "orderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_productId_fkey"
      FOREIGN KEY ("productId")
      REFERENCES "Product" ("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE
);

CREATE INDEX "StockMovement_productId_idx"
ON "StockMovement"("productId");

CREATE INDEX "StockMovement_type_idx"
ON "StockMovement"("type");

CREATE INDEX "StockMovement_createdAt_idx"
ON "StockMovement"("createdAt");
