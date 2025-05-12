ALTER TABLE "Character" ADD COLUMN "order" integer NOT NULL DEFAULT 0;

-- Backfill: set order to match id order
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) - 1 AS rn
  FROM "Character"
)
UPDATE "Character"
SET "order" = ordered.rn
FROM ordered
WHERE "Character".id = ordered.id; 