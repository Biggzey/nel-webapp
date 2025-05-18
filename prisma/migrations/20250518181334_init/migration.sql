/*
  Warnings:

  - You are about to drop the column `bookmarked` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `spec` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `specVersion` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `customInstructions` on the `PendingCharacter` table. All the data in the column will be lost.
  - Made the column `description` on table `Character` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Character" DROP COLUMN "bookmarked",
DROP COLUMN "spec",
DROP COLUMN "specVersion",
DROP COLUMN "status",
ALTER COLUMN "personality" DROP DEFAULT,
ALTER COLUMN "systemPrompt" DROP DEFAULT,
ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "PendingCharacter" DROP COLUMN "customInstructions";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLogin" TIMESTAMP(3);
