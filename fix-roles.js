import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRoles() {
  try {
    // Drop the default constraint
    await prisma.$executeRaw`ALTER TABLE "User" ALTER COLUMN role DROP DEFAULT`;
    console.log('Dropped default constraint');

    // Create the enum type
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "Role" AS ENUM ('USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('Created Role enum type');

    // Update existing values to match the enum case
    await prisma.$executeRaw`UPDATE "User" SET role = UPPER(role)`;
    console.log('Updated role values to uppercase');

    // Convert the column type
    await prisma.$executeRaw`
      ALTER TABLE "User" 
        ALTER COLUMN role TYPE "Role" 
        USING role::text::"Role"
    `;
    console.log('Converted role column to enum type');

    // Set the new default
    await prisma.$executeRaw`
      ALTER TABLE "User" 
        ALTER COLUMN role SET DEFAULT 'USER'::"Role"
    `;
    console.log('Set new default value');

    console.log('Successfully updated role column');
  } catch (error) {
    console.error('Error updating role column:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRoles(); 