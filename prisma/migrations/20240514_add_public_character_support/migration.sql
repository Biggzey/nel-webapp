-- Add isPublic and reviewStatus columns to Character table
ALTER TABLE "Character" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Character" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'private'; 