-- Deleted listings' addresses, so their old pages redirect to the category instead of a 404.
-- Safe to run on a live database: a new, empty table. To reverse: DROP TABLE "removed_listings";

-- CreateTable
CREATE TABLE "removed_listings" (
    "slug" TEXT NOT NULL,
    "category_id" BIGINT,
    "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "removed_listings_pkey" PRIMARY KEY ("slug")
);
