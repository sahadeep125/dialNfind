-- AlterEnum
ALTER TYPE "ReviewStatus" ADD VALUE 'pending';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "review_prompt_sent_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "device_hash" TEXT,
ADD COLUMN     "hold_reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ip_hash" TEXT;

-- CreateTable
CREATE TABLE "review_edits" (
    "id" BIGSERIAL NOT NULL,
    "review_id" BIGINT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "review_text" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_edits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_edits_review_id_created_at_idx" ON "review_edits"("review_id", "created_at");

-- CreateIndex
CREATE INDEX "reviews_status_created_at_idx" ON "reviews"("status", "created_at");

-- AddForeignKey
ALTER TABLE "review_edits" ADD CONSTRAINT "review_edits_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

