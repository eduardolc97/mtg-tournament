-- RedefineTable
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "players" JSONB NOT NULL,
    "rounds" JSONB NOT NULL,
    "leagueYear" INTEGER NOT NULL DEFAULT 2025,
    "leagueMonth" INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "new_Tournament" ("id", "name", "createdAt", "players", "rounds", "leagueYear", "leagueMonth")
SELECT
  "id",
  "name",
  "createdAt",
  "players",
  "rounds",
  CAST(COALESCE(NULLIF(strftime('%Y', "createdAt"), ''), strftime('%Y', 'now')) AS INTEGER),
  CAST(COALESCE(NULLIF(strftime('%m', "createdAt"), ''), strftime('%m', 'now')) AS INTEGER)
FROM "Tournament";
DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
