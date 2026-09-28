-- CreateTable
CREATE TABLE "provider_sources" (
    "id" BIGSERIAL NOT NULL,
    "source_key" TEXT NOT NULL,
    "provider_id" BIGINT,
    "source_type" VARCHAR(20) NOT NULL,
    "source_url" TEXT,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provider_sources_source_key_key" ON "provider_sources"("source_key");

-- CreateIndex
CREATE INDEX "provider_sources_provider_id_idx" ON "provider_sources"("provider_id");

-- AddForeignKey
ALTER TABLE "provider_sources" ADD CONSTRAINT "provider_sources_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

