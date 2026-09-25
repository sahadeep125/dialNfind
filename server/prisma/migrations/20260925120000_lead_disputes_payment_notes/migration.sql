-- Lead disputes (with the promotion charge to refund) and a note on payments recorded by the admin team.
-- CreateEnum
CREATE TYPE "LeadDisputeStatus" AS ENUM ('none', 'open', 'accepted', 'rejected');





-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "dispute_reason" TEXT,
ADD COLUMN     "dispute_resolved_at" TIMESTAMP(3),
ADD COLUMN     "dispute_resolved_by" BIGINT,
ADD COLUMN     "dispute_status" "LeadDisputeStatus" NOT NULL DEFAULT 'none',
ADD COLUMN     "disputed_at" TIMESTAMP(3),
ADD COLUMN     "sponsored_charge" DECIMAL(10,2),
ADD COLUMN     "sponsored_listing_id" BIGINT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "note" TEXT;

-- CreateIndex
CREATE INDEX "leads_dispute_status_idx" ON "leads"("dispute_status");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_sponsored_listing_id_fkey" FOREIGN KEY ("sponsored_listing_id") REFERENCES "sponsored_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_dispute_resolved_by_fkey" FOREIGN KEY ("dispute_resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

