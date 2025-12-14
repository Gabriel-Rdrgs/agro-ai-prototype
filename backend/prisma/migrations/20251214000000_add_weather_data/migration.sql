-- CreateTable
-- ✅ FASE 0 - Semana 3: Tabela para armazenar dados climáticos históricos
CREATE TABLE IF NOT EXISTS "weather_data" (
    "id" SERIAL NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "date" DATE NOT NULL,
    "temperature_max" DOUBLE PRECISION,
    "temperature_min" DOUBLE PRECISION,
    "precipitation" DOUBLE PRECISION,
    "radiation_mj" DOUBLE PRECISION,
    "humidity_avg" DOUBLE PRECISION,
    "et0" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'open-meteo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "weather_data_lat_lng_idx" ON "weather_data"("lat", "lng");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "weather_data_date_idx" ON "weather_data"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "weather_data_lat_lng_date_idx" ON "weather_data"("lat", "lng", "date");

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "weather_data_lat_lng_date_source_key" ON "weather_data"("lat", "lng", "date", "source");
