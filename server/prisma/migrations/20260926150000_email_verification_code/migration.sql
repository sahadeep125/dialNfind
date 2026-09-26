-- AlterEnum
ALTER TYPE "UserTokenType" ADD VALUE 'verify_email_code';

-- AlterTable
ALTER TABLE "user_tokens" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;

-- Email confirmation becomes required. Accounts that existed before this are treated as confirmed.
UPDATE "users" SET "email_verified_at" = now() WHERE "email_verified_at" IS NULL AND "status" <> 'deleted';
