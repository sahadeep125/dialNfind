-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'provider', 'customer');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('google', 'apple');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('individual', 'company');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('none', 'partial', 'verified');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('pending', 'active', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('phone', 'business', 'location', 'id_proof');

-- CreateEnum
CREATE TYPE "ReviewableStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "AttributeAppliesTo" AS ENUM ('lead', 'provider');

-- CreateEnum
CREATE TYPE "AttributeFieldType" AS ENUM ('text', 'number', 'select', 'multiselect', 'boolean');

-- CreateEnum
CREATE TYPE "AttributeEntityType" AS ENUM ('lead', 'provider_service');

-- CreateEnum
CREATE TYPE "PriceUnit" AS ENUM ('per_visit', 'per_hour', 'fixed');

-- CreateEnum
CREATE TYPE "LeadChannel" AS ENUM ('call', 'whatsapp');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('search', 'ai_match', 'category_browse', 'profile');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('published', 'flagged', 'removed');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('subscription', 'lead_fee', 'sponsored_ad');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('success', 'failed', 'pending', 'refunded');

-- CreateEnum
CREATE TYPE "SponsoredStatus" AS ENUM ('active', 'paused', 'completed');

-- CreateEnum
CREATE TYPE "FlagTargetType" AS ENUM ('provider', 'review');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('open', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ClaimMethod" AS ENUM ('phone_otp', 'document');

-- CreateEnum
CREATE TYPE "ContactMessageStatus" AS ENUM ('new', 'in_progress', 'closed');

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'customer',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "phone" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "profile_photo_url" TEXT,
    "terms_accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_oauth_accounts" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "email_from_provider" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "address_line" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "slug" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "cover_url" TEXT,
    "business_type" "BusinessType" NOT NULL DEFAULT 'individual',
    "years_experience" INTEGER,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "website" TEXT,
    "address_line" TEXT,
    "locality" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "location" geography(Point, 4326),
    "service_radius_km" INTEGER NOT NULL DEFAULT 10,
    "whatsapp_number" TEXT,
    "accepts_calls" BOOLEAN NOT NULL DEFAULT true,
    "accepts_whatsapp" BOOLEAN NOT NULL DEFAULT true,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "avg_rating" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "self_reported_completed_jobs" INTEGER,
    "response_signal" DECIMAL(4,3),
    "profile_completeness_pct" INTEGER NOT NULL DEFAULT 0,
    "ranking_score" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'none',
    "status" "ProviderStatus" NOT NULL DEFAULT 'pending',
    "claimed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_business_hours" (
    "id" BIGSERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "open_time" VARCHAR(5),
    "close_time" VARCHAR(5),
    "is_24x7" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "provider_business_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_service_areas" (
    "id" BIGSERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "area_name" TEXT NOT NULL,
    "pincode" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),

    CONSTRAINT "provider_service_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_portfolio" (
    "id" BIGSERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "category_id" BIGINT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" BIGSERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "type" "VerificationType" NOT NULL,
    "status" "ReviewableStatus" NOT NULL DEFAULT 'pending',
    "document_url" TEXT,
    "notes" TEXT,
    "verified_by" BIGINT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon_url" TEXT,
    "criteria_description" TEXT,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_badges" (
    "id" BIGSERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "badge_id" BIGINT NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_claims" (
    "id" BIGSERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "method" "ClaimMethod" NOT NULL DEFAULT 'phone_otp',
    "status" "ClaimStatus" NOT NULL DEFAULT 'pending',
    "document_url" TEXT,
    "otp_hash" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "reviewed_by" BIGINT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_daily_stats" (
    "id" BIGSERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "date" DATE NOT NULL,
    "profile_views" INTEGER NOT NULL DEFAULT 0,
    "search_impressions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "provider_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon_url" TEXT,
    "ui_template" TEXT NOT NULL DEFAULT 'default',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "provider_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategories" (
    "id" BIGSERIAL NOT NULL,
    "category_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_attributes" (
    "id" BIGSERIAL NOT NULL,
    "category_id" BIGINT NOT NULL,
    "subcategory_id" BIGINT,
    "applies_to" "AttributeAppliesTo" NOT NULL,
    "label" TEXT NOT NULL,
    "field_type" "AttributeFieldType" NOT NULL,
    "options_json" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" BIGINT,

    CONSTRAINT "category_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_services" (
    "id" BIGSERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "category_id" BIGINT NOT NULL,
    "subcategory_id" BIGINT,
    "starting_price" DECIMAL(10,2),
    "price_unit" "PriceUnit" NOT NULL DEFAULT 'per_visit',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "provider_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_values" (
    "id" BIGSERIAL NOT NULL,
    "attribute_id" BIGINT NOT NULL,
    "entity_type" "AttributeEntityType" NOT NULL,
    "entity_id" BIGINT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_queries" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "raw_query" TEXT NOT NULL,
    "parsed_category_id" BIGINT,
    "parsed_subcategory_id" BIGINT,
    "parsed_location_text" TEXT,
    "parsed_urgency" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "results_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "provider_id" BIGINT NOT NULL,
    "category_id" BIGINT,
    "subcategory_id" BIGINT,
    "channel" "LeadChannel" NOT NULL,
    "source" "LeadSource" NOT NULL DEFAULT 'search',
    "description" TEXT,
    "customer_reported_response" BOOLEAN,
    "customer_reported_response_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" BIGSERIAL NOT NULL,
    "lead_id" BIGINT,
    "provider_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "review_text" TEXT,
    "provider_reply" TEXT,
    "provider_reply_at" TIMESTAMP(3),
    "status" "ReviewStatus" NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_photos" (
    "id" BIGSERIAL NOT NULL,
    "review_id" BIGINT NOT NULL,
    "photo_url" TEXT NOT NULL,

    CONSTRAINT "review_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'monthly',
    "lead_access_limit" INTEGER,
    "analytics_enabled" BOOLEAN NOT NULL DEFAULT false,
    "ranking_boost" DECIMAL(4,3) NOT NULL DEFAULT 0,
    "badge_id" BIGINT,
    "features_json" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_subscriptions" (
    "id" BIGSERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "plan_id" BIGINT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "provider_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" BIGSERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "gateway_txn_id" TEXT,
    "invoice_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsored_listings" (
    "id" BIGSERIAL NOT NULL,
    "provider_id" BIGINT NOT NULL,
    "category_id" BIGINT NOT NULL,
    "target_location" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "budget" DECIMAL(10,2) NOT NULL,
    "amount_spent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "status" "SponsoredStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "sponsored_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "data_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_activity_logs" (
    "id" BIGSERIAL NOT NULL,
    "admin_id" BIGINT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" BIGINT,
    "details_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports_flags" (
    "id" BIGSERIAL NOT NULL,
    "reporter_user_id" BIGINT,
    "target_type" "FlagTargetType" NOT NULL,
    "target_id" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "FlagStatus" NOT NULL DEFAULT 'open',
    "resolved_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" BIGSERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" "ContactMessageStatus" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "user_oauth_accounts_user_id_idx" ON "user_oauth_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_oauth_accounts_provider_provider_user_id_key" ON "user_oauth_accounts"("provider", "provider_user_id");

-- CreateIndex
CREATE INDEX "user_addresses_user_id_idx" ON "user_addresses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "providers_user_id_key" ON "providers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "providers_slug_key" ON "providers"("slug");

-- CreateIndex
CREATE INDEX "providers_status_ranking_score_idx" ON "providers"("status", "ranking_score");

-- CreateIndex
CREATE INDEX "providers_city_idx" ON "providers"("city");

-- CreateIndex
CREATE UNIQUE INDEX "provider_business_hours_provider_id_day_of_week_key" ON "provider_business_hours"("provider_id", "day_of_week");

-- CreateIndex
CREATE INDEX "provider_service_areas_provider_id_idx" ON "provider_service_areas"("provider_id");

-- CreateIndex
CREATE INDEX "provider_service_areas_area_name_idx" ON "provider_service_areas"("area_name");

-- CreateIndex
CREATE INDEX "provider_portfolio_provider_id_idx" ON "provider_portfolio"("provider_id");

-- CreateIndex
CREATE INDEX "verifications_provider_id_idx" ON "verifications"("provider_id");

-- CreateIndex
CREATE INDEX "verifications_status_idx" ON "verifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "badges_name_key" ON "badges"("name");

-- CreateIndex
CREATE UNIQUE INDEX "provider_badges_provider_id_badge_id_key" ON "provider_badges"("provider_id", "badge_id");

-- CreateIndex
CREATE INDEX "provider_claims_provider_id_idx" ON "provider_claims"("provider_id");

-- CreateIndex
CREATE INDEX "provider_claims_user_id_idx" ON "provider_claims"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_daily_stats_provider_id_date_key" ON "provider_daily_stats"("provider_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subcategories_slug_key" ON "subcategories"("slug");

-- CreateIndex
CREATE INDEX "subcategories_category_id_idx" ON "subcategories"("category_id");

-- CreateIndex
CREATE INDEX "category_attributes_category_id_idx" ON "category_attributes"("category_id");

-- CreateIndex
CREATE INDEX "provider_services_category_id_idx" ON "provider_services"("category_id");

-- CreateIndex
CREATE INDEX "provider_services_subcategory_id_idx" ON "provider_services"("subcategory_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_services_provider_id_category_id_subcategory_id_key" ON "provider_services"("provider_id", "category_id", "subcategory_id");

-- CreateIndex
CREATE INDEX "attribute_values_entity_type_entity_id_idx" ON "attribute_values"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "search_queries_created_at_idx" ON "search_queries"("created_at");

-- CreateIndex
CREATE INDEX "leads_provider_id_created_at_idx" ON "leads"("provider_id", "created_at");

-- CreateIndex
CREATE INDEX "leads_user_id_idx" ON "leads"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_lead_id_key" ON "reviews"("lead_id");

-- CreateIndex
CREATE INDEX "reviews_provider_id_status_created_at_idx" ON "reviews"("provider_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_provider_id_user_id_key" ON "reviews"("provider_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_provider_id_key" ON "favorites"("user_id", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE INDEX "provider_subscriptions_provider_id_status_idx" ON "provider_subscriptions"("provider_id", "status");

-- CreateIndex
CREATE INDEX "transactions_provider_id_created_at_idx" ON "transactions"("provider_id", "created_at");

-- CreateIndex
CREATE INDEX "sponsored_listings_category_id_status_idx" ON "sponsored_listings"("category_id", "status");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "admin_activity_logs_target_type_target_id_idx" ON "admin_activity_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "reports_flags_target_type_target_id_idx" ON "reports_flags"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- AddForeignKey
ALTER TABLE "user_oauth_accounts" ADD CONSTRAINT "user_oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_business_hours" ADD CONSTRAINT "provider_business_hours_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_service_areas" ADD CONSTRAINT "provider_service_areas_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_portfolio" ADD CONSTRAINT "provider_portfolio_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_portfolio" ADD CONSTRAINT "provider_portfolio_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_badges" ADD CONSTRAINT "provider_badges_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_badges" ADD CONSTRAINT "provider_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_claims" ADD CONSTRAINT "provider_claims_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_claims" ADD CONSTRAINT "provider_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_claims" ADD CONSTRAINT "provider_claims_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_daily_stats" ADD CONSTRAINT "provider_daily_stats_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "category_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_parsed_category_id_fkey" FOREIGN KEY ("parsed_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_parsed_subcategory_id_fkey" FOREIGN KEY ("parsed_subcategory_id") REFERENCES "subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_photos" ADD CONSTRAINT "review_photos_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_subscriptions" ADD CONSTRAINT "provider_subscriptions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_subscriptions" ADD CONSTRAINT "provider_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsored_listings" ADD CONSTRAINT "sponsored_listings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsored_listings" ADD CONSTRAINT "sponsored_listings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_flags" ADD CONSTRAINT "reports_flags_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_flags" ADD CONSTRAINT "reports_flags_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- PostGIS: keep providers.location in sync with latitude/longitude
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE OR REPLACE FUNCTION providers_sync_location() RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision), 4326)::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER providers_sync_location_trg
BEFORE INSERT OR UPDATE OF latitude, longitude ON "providers"
FOR EACH ROW EXECUTE FUNCTION providers_sync_location();

CREATE INDEX "providers_location_gist" ON "providers" USING GIST ("location");

-- Fuzzy text search over business names and categories
CREATE INDEX "providers_business_name_trgm" ON "providers" USING GIN ("business_name" gin_trgm_ops);
CREATE INDEX "categories_name_trgm" ON "categories" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "subcategories_name_trgm" ON "subcategories" USING GIN ("name" gin_trgm_ops);

-- Review ratings are 1..5
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "provider_business_hours" ADD CONSTRAINT "provider_business_hours_day_range" CHECK ("day_of_week" BETWEEN 0 AND 6);
