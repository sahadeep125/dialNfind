-- Claims are proven with a document only; the SMS code columns go.
ALTER TABLE "provider_claims" DROP COLUMN "otp_expires_at",
DROP COLUMN "otp_hash",
ALTER COLUMN "method" SET DEFAULT 'document';

-- Google/Apple sign-in and push notifications were never connected.
ALTER TABLE "device_tokens" DROP CONSTRAINT "device_tokens_user_id_fkey";
ALTER TABLE "user_oauth_accounts" DROP CONSTRAINT "user_oauth_accounts_user_id_fkey";
DROP TABLE "device_tokens";
DROP TABLE "user_oauth_accounts";
DROP TYPE "OAuthProvider";

-- Plugin keys and settings nothing reads any more.
DELETE FROM "settings" WHERE "key" LIKE 'plugin.%' OR "key" IN ('lead_fee_amount', 'gst_percent', 'gstin', 'company_address');
