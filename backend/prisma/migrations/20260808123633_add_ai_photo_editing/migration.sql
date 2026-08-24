-- CreateEnum
CREATE TYPE "ProductImageEditStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISCARDED');

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "previousKey" TEXT,
ADD COLUMN     "previousUrl" TEXT;

-- CreateTable
CREATE TABLE "ProductImageEdit" (
    "id" TEXT NOT NULL,
    "productImageId" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "operations" JSONB NOT NULL,
    "previewUrl" TEXT NOT NULL,
    "previewKey" TEXT NOT NULL,
    "status" "ProductImageEditStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImageEdit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductImageEdit_productImageId_idx" ON "ProductImageEdit"("productImageId");

-- AddForeignKey
ALTER TABLE "ProductImageEdit" ADD CONSTRAINT "ProductImageEdit_productImageId_fkey" FOREIGN KEY ("productImageId") REFERENCES "ProductImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
