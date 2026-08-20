-- CreateEnum
CREATE TYPE "Alignment" AS ENUM ('FACE', 'HEEL', 'TWEENER');

-- CreateEnum
CREATE TYPE "WrestlerStatus" AS ENUM ('ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "Cadence" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "SegmentType" AS ENUM ('MATCH', 'PROMO', 'BACKSTAGE', 'CONTRACT_SIGNING', 'VIDEO_PACKAGE', 'BRAWL', 'INTERVIEW', 'ANGLE', 'OTHER');

-- CreateTable
CREATE TABLE "World" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "World_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wrestler" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "height" TEXT,
    "weight" TEXT,
    "align" "Alignment" NOT NULL DEFAULT 'TWEENER',
    "status" "WrestlerStatus" NOT NULL DEFAULT 'ACTIVE',
    "signatureMoves" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wrestler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WrestlerPhoto" (
    "wrestlerId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WrestlerPhoto_pkey" PRIMARY KEY ("wrestlerId")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "color" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "wrestlerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "signedOn" DATE,
    "expiresOn" DATE,
    "salary" TEXT,
    "notes" TEXT,
    "endedOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Title" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Title_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reign" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "startedOn" DATE NOT NULL,
    "wonAtShowId" TEXT,
    "wonAtSegmentId" TEXT,
    "endedOn" DATE,
    "lostAtShowId" TEXT,
    "lostAtSegmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklySeries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cadence" "Cadence" NOT NULL DEFAULT 'WEEKLY',
    "startsOn" DATE NOT NULL,
    "endedOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklySeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Show" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "seriesId" TEXT,
    "venue" TEXT,
    "notes" TEXT,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "playedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Show_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "SegmentType" NOT NULL DEFAULT 'MATCH',
    "customType" TEXT,
    "note" TEXT,
    "isTitleMatch" BOOLEAN NOT NULL DEFAULT false,
    "titleId" TEXT,
    "stipulation" TEXT,
    "resultNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SegmentParticipant" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "wrestlerId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SegmentParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ShowCompanies" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ShowCompanies_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ReignHolders" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ReignHolders_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Wrestler_worldId_name_idx" ON "Wrestler"("worldId", "name");

-- CreateIndex
CREATE INDEX "Company_worldId_name_idx" ON "Company"("worldId", "name");

-- CreateIndex
CREATE INDEX "Contract_wrestlerId_idx" ON "Contract"("wrestlerId");

-- CreateIndex
CREATE INDEX "Contract_companyId_idx" ON "Contract"("companyId");

-- CreateIndex
CREATE INDEX "Title_companyId_idx" ON "Title"("companyId");

-- CreateIndex
CREATE INDEX "Reign_titleId_startedOn_idx" ON "Reign"("titleId", "startedOn");

-- CreateIndex
CREATE INDEX "WeeklySeries_companyId_idx" ON "WeeklySeries"("companyId");

-- CreateIndex
CREATE INDEX "Show_worldId_date_idx" ON "Show"("worldId", "date");

-- CreateIndex
CREATE INDEX "Show_seriesId_date_idx" ON "Show"("seriesId", "date");

-- CreateIndex
CREATE INDEX "Segment_showId_order_idx" ON "Segment"("showId", "order");

-- CreateIndex
CREATE INDEX "SegmentParticipant_wrestlerId_idx" ON "SegmentParticipant"("wrestlerId");

-- CreateIndex
CREATE UNIQUE INDEX "SegmentParticipant_segmentId_wrestlerId_key" ON "SegmentParticipant"("segmentId", "wrestlerId");

-- CreateIndex
CREATE INDEX "_ShowCompanies_B_index" ON "_ShowCompanies"("B");

-- CreateIndex
CREATE INDEX "_ReignHolders_B_index" ON "_ReignHolders"("B");

-- AddForeignKey
ALTER TABLE "Wrestler" ADD CONSTRAINT "Wrestler_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrestlerPhoto" ADD CONSTRAINT "WrestlerPhoto_wrestlerId_fkey" FOREIGN KEY ("wrestlerId") REFERENCES "Wrestler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_wrestlerId_fkey" FOREIGN KEY ("wrestlerId") REFERENCES "Wrestler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Title" ADD CONSTRAINT "Title_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reign" ADD CONSTRAINT "Reign_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reign" ADD CONSTRAINT "Reign_wonAtShowId_fkey" FOREIGN KEY ("wonAtShowId") REFERENCES "Show"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reign" ADD CONSTRAINT "Reign_lostAtShowId_fkey" FOREIGN KEY ("lostAtShowId") REFERENCES "Show"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySeries" ADD CONSTRAINT "WeeklySeries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Show" ADD CONSTRAINT "Show_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Show" ADD CONSTRAINT "Show_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "WeeklySeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegmentParticipant" ADD CONSTRAINT "SegmentParticipant_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegmentParticipant" ADD CONSTRAINT "SegmentParticipant_wrestlerId_fkey" FOREIGN KEY ("wrestlerId") REFERENCES "Wrestler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ShowCompanies" ADD CONSTRAINT "_ShowCompanies_A_fkey" FOREIGN KEY ("A") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ShowCompanies" ADD CONSTRAINT "_ShowCompanies_B_fkey" FOREIGN KEY ("B") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReignHolders" ADD CONSTRAINT "_ReignHolders_A_fkey" FOREIGN KEY ("A") REFERENCES "Reign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReignHolders" ADD CONSTRAINT "_ReignHolders_B_fkey" FOREIGN KEY ("B") REFERENCES "Wrestler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
