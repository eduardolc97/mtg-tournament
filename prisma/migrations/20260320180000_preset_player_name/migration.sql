-- CreateTable
CREATE TABLE "PresetPlayerName" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PresetPlayerName_name_key" ON "PresetPlayerName"("name");
