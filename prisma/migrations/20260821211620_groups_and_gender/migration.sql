-- Gender is recorded, never inferred, and may be left unset.
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
ALTER TABLE "Wrestler" ADD COLUMN "gender" "Gender";

-- Tag teams, trios and factions are one table. The kind is derived from the
-- member count, so nothing here records which it is.
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Group_worldId_name_idx" ON "Group"("worldId", "name");

ALTER TABLE "Group" ADD CONSTRAINT "Group_worldId_fkey"
    FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "_GroupMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_GroupMembers_AB_pkey" PRIMARY KEY ("A", "B")
);

CREATE INDEX "_GroupMembers_B_index" ON "_GroupMembers"("B");

ALTER TABLE "_GroupMembers" ADD CONSTRAINT "_GroupMembers_A_fkey"
    FOREIGN KEY ("A") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_GroupMembers" ADD CONSTRAINT "_GroupMembers_B_fkey"
    FOREIGN KEY ("B") REFERENCES "Wrestler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
