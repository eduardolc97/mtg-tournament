-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "players" JSONB NOT NULL,
    "rounds" JSONB NOT NULL,
    "leagueYear" INTEGER NOT NULL,
    "leagueMonth" INTEGER NOT NULL
);
INSERT INTO "new_Tournament" ("createdAt", "id", "leagueMonth", "leagueYear", "name", "players", "rounds") SELECT "createdAt", "id", "leagueMonth", "leagueYear", "name", "players", "rounds" FROM "Tournament";
DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
