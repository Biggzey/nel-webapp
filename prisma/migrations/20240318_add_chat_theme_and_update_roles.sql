-- Update user roles
UPDATE "User" SET role = 'USER' WHERE role = 'member';
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE username = 'Biggzey';
ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'USER';

-- Add chatTheme to UserPreference if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'UserPreference' 
        AND column_name = 'chatTheme'
    ) THEN
        ALTER TABLE "UserPreference" ADD COLUMN "chatTheme" TEXT NOT NULL DEFAULT 'default';
    END IF;
END $$; 