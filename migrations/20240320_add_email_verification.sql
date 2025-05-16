-- Add email verification fields to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "verificationToken" TEXT,
ADD COLUMN IF NOT EXISTS "verificationTokenExpires" TIMESTAMP(3);

-- Create index for verification token lookups
CREATE INDEX IF NOT EXISTS "User_verificationToken_idx" ON "User"("verificationToken");

-- Add comment to explain the new fields
COMMENT ON COLUMN "User"."emailVerified" IS 'Whether the user has verified their email address';
COMMENT ON COLUMN "User"."verificationToken" IS 'Token used for email verification';
COMMENT ON COLUMN "User"."verificationTokenExpires" IS 'Expiration timestamp for the verification token'; 