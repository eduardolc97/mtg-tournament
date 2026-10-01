import type { Player, TableOutcome, TableResult } from '../types/tournament';

export const COMMANDER_SCORE_OPTIONS = [4, 3, 2, 1, 0] as const;

export function commanderScoreOptions(playerCount: number): number[] {
  return playerCount === 4
    ? [...COMMANDER_SCORE_OPTIONS]
    : COMMANDER_SCORE_OPTIONS.filter((points) => points !== 0);
}

export function buildCommanderTableResults(
  players: Player[],
  scoresByPlayerId: Record<string, string>
): TableResult[] | null {
  const validScores = commanderScoreOptions(players.length);
  const results: TableResult[] = [];

  for (const player of players) {
    const value = Number(scoresByPlayerId[player.id]);
    if (!Number.isInteger(value) || !validScores.includes(value)) {
      return null;
    }
    results.push({
      playerId: player.id,
      outcome: { type: 'points', value: value as 0 | 1 | 2 | 3 | 4 },
      points: value,
    });
  }

  return results;
}

export function scoreFromCommanderOutcome(
  outcome: TableOutcome
): number | null {
  return outcome.type === 'points' ? outcome.value : null;
}
