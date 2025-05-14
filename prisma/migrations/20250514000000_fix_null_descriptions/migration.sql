-- Fix NULL descriptions in Character table
UPDATE "Character" SET "description" = '' WHERE "description" IS NULL; 