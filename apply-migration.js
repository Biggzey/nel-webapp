import { PrismaClient } from '@prisma/client';

async function applyMigration() {
  const prisma = new PrismaClient();
  
  try {
    // Update existing member roles to USER
    await prisma.$executeRaw`UPDATE "User" SET role = 'USER' WHERE role = 'member'`;
    console.log('Updated member roles to USER');

    // Set Biggzey as SUPER_ADMIN
    await prisma.$executeRaw`UPDATE "User" SET role = 'SUPER_ADMIN' WHERE username = 'Biggzey'`;
    console.log('Set Biggzey as SUPER_ADMIN');

    // Set default role to USER
    await prisma.$executeRaw`ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'USER'`;
    console.log('Set default role to USER');

    // Add chatTheme column if it doesn't exist
    await prisma.$executeRaw`
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
    `;
    console.log('Added chatTheme column if needed');
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration(); 