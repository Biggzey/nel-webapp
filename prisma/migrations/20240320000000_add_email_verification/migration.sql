-- Add email verification fields to User table
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verificationToken" TEXT UNIQUE;
ALTER TABLE "User" ADD COLUMN "verificationTokenExpires" TIMESTAMP(3); 