-- Delete the failed migration record
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20240506_update_role_to_enum';

-- Clean up any leftover temporary columns or types
DO $$ 
BEGIN
    -- Drop temporary column if it exists
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'User' 
        AND column_name = 'role_new'
    ) THEN
        ALTER TABLE "User" DROP COLUMN role_new;
    END IF;

    -- Drop enum type if it exists
    DROP TYPE IF EXISTS "Role";
END $$; 