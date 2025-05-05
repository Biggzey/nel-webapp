-- Add role column to User table
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'member';

-- Set Biggzey as superadmin
UPDATE "User" SET role = 'superadmin' WHERE username = 'Biggzey'; 