-- CreateTable
CREATE TABLE "CeasaPrice" (
    "id" SERIAL NOT NULL,
    "ceasa_region" TEXT NOT NULL,
    "ceasa_name" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "unit_type" TEXT,
    "price_min" DOUBLE PRECISION NOT NULL,
    "price_max" DOUBLE PRECISION NOT NULL,
    "price_avg" DOUBLE PRECISION NOT NULL,
    "price_date" TIMESTAMP(3) NOT NULL,
    "sync_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CeasaPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CeasaSyncLog" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "records_synced" INTEGER NOT NULL,
    "error_message" TEXT,
    "sync_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CeasaSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CeasaPrice_product_name_idx" ON "CeasaPrice"("product_name");

-- CreateIndex
CREATE INDEX "CeasaPrice_ceasa_region_idx" ON "CeasaPrice"("ceasa_region");

-- CreateIndex
CREATE INDEX "CeasaPrice_price_date_idx" ON "CeasaPrice"("price_date");

-- CreateIndex
CREATE UNIQUE INDEX "CeasaPrice_ceasa_region_product_name_price_date_key" ON "CeasaPrice"("ceasa_region", "product_name", "price_date");

-- CreateIndex
CREATE INDEX "CeasaSyncLog_source_idx" ON "CeasaSyncLog"("source");

-- CreateIndex
CREATE INDEX "CeasaSyncLog_sync_timestamp_idx" ON "CeasaSyncLog"("sync_timestamp");
