-- Individual professionals first. Safe to run on a live database.
--
-- 1. An account may now own several listings (an individual professional lists each profession
--    separately), so providers.user_id is no longer unique. It stays indexed.
-- 2. providers.profession: the title an individual shows after their name ("Plumber"). Nullable;
--    when empty the listing's main service supplies it.
-- 3. categories/subcategories.profession_name: what an individual offering the service is called.
--    Filled by the bootstrap step (prisma/bootstrap.ts), which also adds the new profession categories.
-- 4. Every listing that exists today becomes a business listing. The old onboarding preselected
--    "individual", so the stored value cannot be trusted; owners can switch to "Individual professional"
--    from their profile.
--
-- To reverse: restore the unique index only if no account owns more than one listing
--   (CREATE UNIQUE INDEX "providers_user_id_key" ON "providers"("user_id"); DROP INDEX "providers_user_id_idx";),
--   then drop the new columns. The business_type update cannot be undone automatically.

-- DropIndex
DROP INDEX "providers_user_id_key";

-- CreateIndex
CREATE INDEX "providers_user_id_idx" ON "providers"("user_id");

-- AlterTable
ALTER TABLE "providers" ADD COLUMN "profession" VARCHAR(80);
ALTER TABLE "categories" ADD COLUMN "profession_name" TEXT;
ALTER TABLE "subcategories" ADD COLUMN "profession_name" TEXT;

-- Existing listings are businesses, and so is a listing created without an account type (admin tools,
-- imports). The apps ask new providers which one they are, with "Individual professional" first.
UPDATE "providers" SET "business_type" = 'company' WHERE "business_type" = 'individual';
ALTER TABLE "providers" ALTER COLUMN "business_type" SET DEFAULT 'company';
