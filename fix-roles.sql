-- Drop the default constraint first
ALTER TABLE "User" ALTER COLUMN role DROP DEFAULT;

-- Create the enum type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update existing values to match the enum case
UPDATE "User" SET role = UPPER(role);

-- Convert the column type
ALTER TABLE "User" 
  ALTER COLUMN role TYPE "Role" 
  USING role::text::"Role";

-- Set the new default
ALTER TABLE "User" 
  ALTER COLUMN role SET DEFAULT 'USER'::"Role"; 