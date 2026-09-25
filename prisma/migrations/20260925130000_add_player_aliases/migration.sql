CREATE TABLE "player_aliases" (
    "alias_key" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_aliases_pkey" PRIMARY KEY ("alias_key")
);

CREATE INDEX "player_aliases_player_id_idx" ON "player_aliases"("player_id");

ALTER TABLE "player_aliases"
ADD CONSTRAINT "player_aliases_player_id_fkey"
FOREIGN KEY ("player_id") REFERENCES "players"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
