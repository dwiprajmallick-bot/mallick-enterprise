/*
  Warnings:

  - A unique constraint covering the columns `[goodsReceiptId]` on the table `Purchase` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN "goodsReceiptId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_goodsReceiptId_key" ON "Purchase"("goodsReceiptId");
