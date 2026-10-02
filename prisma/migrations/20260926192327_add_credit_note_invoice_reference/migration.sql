-- AlterTable
ALTER TABLE "CreditNote" ADD COLUMN "invoiceId" TEXT;

-- CreateIndex
CREATE INDEX "CreditNote_invoiceId_idx" ON "CreditNote"("invoiceId");
