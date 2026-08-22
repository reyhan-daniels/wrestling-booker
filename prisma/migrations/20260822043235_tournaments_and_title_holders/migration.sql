-- How many people hold a belt: 1 singles, 2 tag, 3 trios. Existing belts stay
-- singles, which is what they were.
ALTER TABLE "Title" ADD COLUMN "holderCount" INTEGER NOT NULL DEFAULT 1;

CREATE TYPE "TournamentFormat" AS ENUM ('ROUND_ROBIN', 'SINGLE_ELIMINATION');

CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "format" "TournamentFormat" NOT NULL DEFAULT 'ROUND_ROBIN',
    "color" TEXT,
    "notes" TEXT,
    "pointsWin" INTEGER NOT NULL DEFAULT 2,
    "pointsDraw" INTEGER NOT NULL DEFAULT 1,
    "startsOn" DATE,
    "endsOn" DATE,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Tournament_worldId_name_idx" ON "Tournament"("worldId", "name");
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_worldId_fkey"
    FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TournamentEntrant" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "wrestlerId" TEXT,
    "groupId" TEXT,
    "block" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TournamentEntrant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TournamentEntrant_tournamentId_idx" ON "TournamentEntrant"("tournamentId");
ALTER TABLE "TournamentEntrant" ADD CONSTRAINT "TournamentEntrant_tournamentId_fkey"
    FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentEntrant" ADD CONSTRAINT "TournamentEntrant_wrestlerId_fkey"
    FOREIGN KEY ("wrestlerId") REFERENCES "Wrestler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentEntrant" ADD CONSTRAINT "TournamentEntrant_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- An entrant is a wrestler or a unit, never both and never neither.
ALTER TABLE "TournamentEntrant" ADD CONSTRAINT "TournamentEntrant_one_competitor"
    CHECK (("wrestlerId" IS NOT NULL) <> ("groupId" IS NOT NULL));

ALTER TABLE "Segment" ADD COLUMN "tournamentId" TEXT;
ALTER TABLE "Segment" ADD COLUMN "tournamentRound" INTEGER;
CREATE INDEX "Segment_tournamentId_idx" ON "Segment"("tournamentId");
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_tournamentId_fkey"
    FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;
