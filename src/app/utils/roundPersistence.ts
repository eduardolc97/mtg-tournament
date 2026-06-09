import type { Player, Round } from '../types/tournament';

export type StoredTablePlayer = { id: string };

export function stripPlayersForStorage(players: Player[]): StoredTablePlayer[] {
  return players.map((p) => ({ id: p.id }));
}

export function stripRoundsForStorage(rounds: Round[]): Round[] {
  return rounds.map((round) => ({
    ...round,
    tables: round.tables.map((table) => ({
      ...table,
      players: stripPlayersForStorage(table.players),
    })),
  }));
}
