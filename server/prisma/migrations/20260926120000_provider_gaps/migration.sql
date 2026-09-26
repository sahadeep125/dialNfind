-- CreateEnum
CREATE TYPE "LeadProviderStatus" AS ENUM ('new', 'contacted', 'won', 'lost');

-- CreateEnum
CREATE TYPE "SponsoredOrderStatus" AS ENUM ('created', 'paid', 'failed');

-- DropIndex
DROP INDEX "provider_portfolio_provider_id_idx";

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "provider_note" TEXT,
ADD COLUMN     "provider_status" "LeadProviderStatus" NOT NULL DEFAULT 'new',
ADD COLUMN     "provider_updated_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "provider_portfolio" ADD COLUMN     "is_cover" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "sponsored_orders" (
    "id" BIGSERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "category_id" BIGINT NOT NULL,
    "days" INTEGER NOT NULL,
    "budget" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "razorpay_order_id" TEXT NOT NULL,
    "status" "SponsoredOrderStatus" NOT NULL DEFAULT 'created',
    "sponsored_listing_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsored_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sponsored_orders_razorpay_order_id_key" ON "sponsored_orders"("razorpay_order_id");

-- CreateIndex
CREATE INDEX "sponsored_orders_provider_id_idx" ON "sponsored_orders"("provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens"("user_id");

-- CreateIndex
CREATE INDEX "leads_provider_id_provider_status_idx" ON "leads"("provider_id", "provider_status");

-- CreateIndex
CREATE INDEX "provider_portfolio_provider_id_sort_order_idx" ON "provider_portfolio"("provider_id", "sort_order");

-- AddForeignKey
ALTER TABLE "sponsored_orders" ADD CONSTRAINT "sponsored_orders_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsored_orders" ADD CONSTRAINT "sponsored_orders_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsored_orders" ADD CONSTRAINT "sponsored_orders_sponsored_listing_id_fkey" FOREIGN KEY ("sponsored_listing_id") REFERENCES "sponsored_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

