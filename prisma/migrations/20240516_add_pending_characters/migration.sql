-- CreateTable
CREATE TABLE "PendingCharacter" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "fullImage" TEXT,
    "age" TEXT,
    "gender" TEXT,
    "race" TEXT,
    "occupation" TEXT,
    "likes" TEXT,
    "dislikes" TEXT,
    "personality" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "customInstructions" TEXT,
    "backstory" TEXT,
    "firstMessage" TEXT,
    "messageExample" TEXT,
    "scenario" TEXT,
    "creatorNotes" TEXT,
    "alternateGreetings" TEXT[],
    "tags" TEXT[],
    "creator" TEXT,
    "characterVersion" TEXT,
    "extensions" JSONB,
    "userId" INTEGER NOT NULL,
    "originalCharacterId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingCharacter_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PendingCharacter" ADD CONSTRAINT "PendingCharacter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingCharacter" ADD CONSTRAINT "PendingCharacter_originalCharacterId_fkey" FOREIGN KEY ("originalCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE; 