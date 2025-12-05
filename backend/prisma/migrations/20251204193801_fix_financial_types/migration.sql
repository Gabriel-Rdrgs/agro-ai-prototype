/*
  Warnings:

  - You are about to alter the column `price_min` on the `CeasaPrice` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `price_max` on the `CeasaPrice` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `price_avg` on the `CeasaPrice` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `price` on the `PriceHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "CeasaPrice" ALTER COLUMN "price_min" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "price_max" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "price_avg" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "PriceHistory" ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2);
