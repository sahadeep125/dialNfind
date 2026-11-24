-- Search content for category pages, edited in the admin console.
ALTER TABLE "categories"
  ADD COLUMN "image_url" TEXT,
  ADD COLUMN "image_alt" VARCHAR(150),
  ADD COLUMN "seo_title" VARCHAR(70),
  ADD COLUMN "seo_description" VARCHAR(200),
  ADD COLUMN "seo_heading" VARCHAR(100),
  ADD COLUMN "seo_content" TEXT,
  ADD COLUMN "faqs" JSONB NOT NULL DEFAULT '[]';
