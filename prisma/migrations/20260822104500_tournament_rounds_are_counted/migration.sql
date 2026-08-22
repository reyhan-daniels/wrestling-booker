-- Rounds are counted from the matches, not typed in. All a match has to say is
-- whether it is a league's playoff match; everything else falls out of the card.
ALTER TABLE "Segment" ADD COLUMN "isPlayoff" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Segment" s
   SET "isPlayoff" = true
  FROM "Tournament" t
 WHERE s."tournamentId" = t."id"
   AND s."tournamentRound" IS NOT NULL
   AND t."format" = 'ROUND_ROBIN';

ALTER TABLE "Segment" DROP COLUMN "tournamentRound";

-- A tournament runs on the dates of its shows.
ALTER TABLE "Tournament" DROP COLUMN "startsOn";
ALTER TABLE "Tournament" DROP COLUMN "endsOn";
