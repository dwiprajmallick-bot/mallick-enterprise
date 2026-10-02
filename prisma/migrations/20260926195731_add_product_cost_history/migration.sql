-- CreateTable
CREATE TABLE "ProductCostHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT,
    "purchaseId" TEXT,
    "purchaseNumber" TEXT,
    "previousUnitCostPaise" INTEGER NOT NULL DEFAULT 0,
    "newUnitCostPaise" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "effectiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ProductCostHistory_productId_idx" ON "ProductCostHistory"("productId");

-- CreateIndex
CREATE INDEX "ProductCostHistory_supplierId_idx" ON "ProductCostHistory"("supplierId");

-- CreateIndex
CREATE INDEX "ProductCostHistory_purchaseId_idx" ON "ProductCostHistory"("purchaseId");

-- CreateIndex
CREATE INDEX "ProductCostHistory_purchaseNumber_idx" ON "ProductCostHistory"("purchaseNumber");

-- CreateIndex
CREATE INDEX "ProductCostHistory_effectiveAt_idx" ON "ProductCostHistory"("effectiveAt");

-- CreateIndex
CREATE INDEX "ProductCostHistory_createdAt_idx" ON "ProductCostHistory"("createdAt");
