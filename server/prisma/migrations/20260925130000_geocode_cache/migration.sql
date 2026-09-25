-- Cache of geocoder answers (place search, reverse lookup), purged after 30 days.




-- CreateTable
CREATE TABLE "geocode_cache" (
    "key" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geocode_cache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "geocode_cache_created_at_idx" ON "geocode_cache"("created_at");

