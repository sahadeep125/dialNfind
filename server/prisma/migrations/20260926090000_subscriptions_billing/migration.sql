-- Self-serve subscriptions: plan codes and prices, where each subscription was bought (web or app
-- stores), GST invoices, and a log of payment webhooks.

-- CreateEnum
CREATE TYPE "SubscriptionSource" AS ENUM ('admin', 'razorpay', 'app_store', 'play_store');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('manual', 'razorpay', 'app_store', 'play_store');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('issued', 'void');

-- CreateEnum
CREATE TYPE "WebhookSource" AS ENUM ('razorpay', 'revenuecat');

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'pending';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'past_due';

-- AlterTable
ALTER TABLE "provider_subscriptions" ADD COLUMN     "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'monthly',
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "external_id" TEXT,
ADD COLUMN     "grace_until" TIMESTAMP(3),
ADD COLUMN     "source" "SubscriptionSource" NOT NULL DEFAULT 'admin',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "start_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "end_date" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "providers" ADD COLUMN     "billing_address" TEXT,
ADD COLUMN     "billing_name" TEXT,
ADD COLUMN     "billing_state_code" VARCHAR(2),
ADD COLUMN     "gstin" VARCHAR(15);

-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN     "code" TEXT,
ADD COLUMN     "photo_limit" INTEGER;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
ADD COLUMN     "gateway" "PaymentGateway" NOT NULL DEFAULT 'manual',
ADD COLUMN     "gateway_payment_id" TEXT,
ADD COLUMN     "subscription_id" BIGINT;

-- CreateTable
CREATE TABLE "plan_prices" (
    "id" BIGSERIAL NOT NULL,
    "plan_id" BIGINT NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "razorpay_plan_id" TEXT,
    "ios_product_id" TEXT,
    "android_product_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" BIGSERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "transaction_id" BIGINT NOT NULL,
    "billed_to" JSONB NOT NULL,
    "seller" JSONB NOT NULL,
    "lines" JSONB NOT NULL,
    "taxable" DECIMAL(10,2) NOT NULL,
    "cgst" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sgst" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "igst" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "place_of_supply" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'issued',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "fy" TEXT NOT NULL,
    "next" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("fy")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" BIGSERIAL NOT NULL,
    "source" "WebhookSource" NOT NULL,
    "event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "provider_id" BIGINT,
    "processed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- Data: three plans (Free, Pro, Business) with stable codes that decide entitlements.
UPDATE "subscription_plans" SET "code" = CASE "name"
    WHEN 'Free' THEN 'free'
    WHEN 'Basic' THEN 'basic'
    WHEN 'Pro' THEN 'pro'
    WHEN 'Premium' THEN 'business'
    WHEN 'Business' THEN 'business'
    ELSE lower(regexp_replace("name", '[^A-Za-z0-9]+', '_', 'g')) END;
ALTER TABLE "subscription_plans" ALTER COLUMN "code" SET NOT NULL;

UPDATE "subscription_plans" SET "name" = 'Business' WHERE "code" = 'business' AND "name" = 'Premium';
UPDATE "badges" SET "name" = 'Business Partner', "criteria_description" = 'Active Business plan subscriber'
    WHERE "name" = 'Premium Partner' AND NOT EXISTS (SELECT 1 FROM "badges" WHERE "name" = 'Business Partner');

UPDATE "subscription_plans" SET "photo_limit" = 3 WHERE "code" = 'free';
UPDATE "subscription_plans" SET "photo_limit" = 30 WHERE "code" = 'pro';
UPDATE "subscription_plans" SET "photo_limit" = NULL WHERE "code" = 'business';

-- Basic is retired: its subscribers move to Pro until their current end date.
UPDATE "provider_subscriptions" SET "plan_id" = (SELECT "id" FROM "subscription_plans" WHERE "code" = 'pro')
    WHERE "plan_id" = (SELECT "id" FROM "subscription_plans" WHERE "code" = 'basic')
      AND EXISTS (SELECT 1 FROM "subscription_plans" WHERE "code" = 'pro');
UPDATE "subscription_plans" SET "is_active" = false WHERE "code" = 'basic';

-- Existing end dates were whole days; they now run to the end of that day.
UPDATE "provider_subscriptions" SET "end_date" = "end_date" + interval '1 day' - interval '1 second' WHERE "end_date" IS NOT NULL;

INSERT INTO "plan_prices" ("plan_id", "billing_cycle", "amount", "ios_product_id", "android_product_id")
SELECT "id", 'monthly', "price", 'dnf_' || "code" || '_monthly', 'dnf_' || "code" || ':monthly'
FROM "subscription_plans" WHERE "code" IN ('pro', 'business');
INSERT INTO "plan_prices" ("plan_id", "billing_cycle", "amount", "ios_product_id", "android_product_id")
SELECT "id", 'yearly', "price" * 10, 'dnf_' || "code" || '_yearly', 'dnf_' || "code" || ':yearly'
FROM "subscription_plans" WHERE "code" IN ('pro', 'business');

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_razorpay_plan_id_key" ON "plan_prices"("razorpay_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_ios_product_id_key" ON "plan_prices"("ios_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_android_product_id_key" ON "plan_prices"("android_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_plan_id_billing_cycle_key" ON "plan_prices"("plan_id", "billing_cycle");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_transaction_id_key" ON "invoices"("transaction_id");

-- CreateIndex
CREATE INDEX "invoices_provider_id_issued_at_idx" ON "invoices"("provider_id", "issued_at");

-- CreateIndex
CREATE INDEX "invoices_issued_at_idx" ON "invoices"("issued_at");

-- CreateIndex
CREATE INDEX "webhook_events_created_at_idx" ON "webhook_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_source_event_id_key" ON "webhook_events"("source", "event_id");

-- CreateIndex
CREATE INDEX "provider_subscriptions_source_external_id_idx" ON "provider_subscriptions"("source", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_gateway_payment_id_key" ON "transactions"("gateway_payment_id");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

-- AddForeignKey
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "provider_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

