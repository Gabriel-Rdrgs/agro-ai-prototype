-- CreateTable
CREATE TABLE "Opportunity" (
    "id" SERIAL NOT NULL,
    "product" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "buyPrice" DOUBLE PRECISION NOT NULL,
    "sellPrice" DOUBLE PRECISION NOT NULL,
    "sellLocation" TEXT NOT NULL,
    "destLat" DOUBLE PRECISION,
    "destLng" DOUBLE PRECISION,
    "volume" TEXT NOT NULL,
    "riskLevel" INTEGER NOT NULL,
    "climate" TEXT NOT NULL,
    "description" TEXT,
    "season" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);
