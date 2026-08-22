-- How many blocks a league is split into, and how it is settled afterwards.
-- Existing leagues are one block, decided by the table, which is what they were.
CREATE TYPE "PlayoffFormat" AS ENUM (
    'NONE', 'BLOCK_WINNERS', 'TOP_TWO_PER_BLOCK', 'TOP_FOUR_OVERALL', 'TOP_EIGHT_OVERALL'
);
ALTER TABLE "Tournament" ADD COLUMN "blockCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Tournament" ADD COLUMN "playoff" "PlayoffFormat" NOT NULL DEFAULT 'NONE';
