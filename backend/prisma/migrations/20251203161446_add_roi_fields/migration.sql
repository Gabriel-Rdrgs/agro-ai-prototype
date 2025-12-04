/*
  Warnings:

  - You are about to alter the column `buyPrice` on the `Opportunity` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `sellPrice` on the `Opportunity` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "bestRoute" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "freight" DECIMAL(10,2),
ADD COLUMN     "roi" DOUBLE PRECISION DEFAULT 0,
ALTER COLUMN "buyPrice" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "sellPrice" SET DATA TYPE DECIMAL(10,2);

-- CreateTable
CREATE TABLE "fuel_prices" (
    "id" SERIAL NOT NULL,
    "state_code" TEXT NOT NULL,
    "price_per_liter" DOUBLE PRECISION NOT NULL,
    "data_coleta" TIMESTAMP(3) NOT NULL,
    "fonte" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fuel_prices_pkey" PRIMARY KEY ("id")
);
