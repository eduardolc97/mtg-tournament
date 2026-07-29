ALTER TABLE "tournaments" ADD COLUMN "points_doubled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "tournament_participants" ADD COLUMN "wins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tournament_participants" ADD COLUMN "losses" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tournament_participants" ADD COLUMN "draws" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tournament_participants" ADD COLUMN "performance_pct" DECIMAL(5,2);
