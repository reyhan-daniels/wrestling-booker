-- Portraits become an opt-out feature of the world. Existing worlds keep
-- them on, and turning it off never deletes the bytes already stored.
ALTER TABLE "World" ADD COLUMN "photosEnabled" BOOLEAN NOT NULL DEFAULT true;
