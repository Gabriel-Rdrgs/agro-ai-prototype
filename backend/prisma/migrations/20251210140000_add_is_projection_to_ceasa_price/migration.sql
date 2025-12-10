-- AlterTable
ALTER TABLE "CeasaPrice" ADD COLUMN "is_projection" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CeasaPrice" ADD COLUMN "data_type" TEXT;

-- CreateIndex
CREATE INDEX "CeasaPrice_is_projection_idx" ON "CeasaPrice"("is_projection");
