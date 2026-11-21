-- SEO fields on provider listings and a cached 0-100 SEO score. Additive only: every new column is nullable
-- or has a default, so it is safe to run on a live database. Run `pnpm --filter server rank` afterwards to
-- fill seo_score for existing listings (the nightly ranking job also does it).
--
-- To reverse (only if nothing needs the data): ALTER TABLE providers DROP COLUMN seo_title, DROP COLUMN
--   seo_description, DROP COLUMN focus_keyword, DROP COLUMN seo_keywords, DROP COLUMN seo_no_index,
--   DROP COLUMN seo_score;

-- AlterTable
ALTER TABLE "providers" ADD COLUMN     "focus_keyword" VARCHAR(80),
ADD COLUMN     "seo_description" VARCHAR(200),
ADD COLUMN     "seo_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "seo_no_index" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seo_score" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN     "seo_title" VARCHAR(70);

-- CreateIndex
CREATE INDEX "providers_seo_score_idx" ON "providers"("seo_score");
