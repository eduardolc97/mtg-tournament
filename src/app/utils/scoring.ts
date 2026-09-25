import type { Player, TableOutcome, TableResult } from '../types/tournament';

export const POINTS_MAP: Record<number, number> = {
  1: 5,
  2: 3,
  3: 1,
  4: 0,
};

export const TABLE_FIRST_PLACE_POINTS = POINTS_MAP[1];

export function pointsFromOutcome(outcome: TableOutcome, maxPlace: number): number {
  if (outcome.type === 'tie') {
    return 1;
  }
  if (outcome.place < 1 || outcome.place > maxPlace) {
    return 0;
  }
  return POINTS_MAP[outcome.place] ?? 0;
}

export function buildTableResults(
  players: Player[],
  outcomes: Array<TableOutcome | null>
): TableResult[] | null {
  if (outcomes.length !== players.length) {
    return null;
  }

  const maxPlace = players.length;
  const usedPlaces = new Set<number>();

  for (const outcome of outcomes) {
    if (!outcome) {
      return null;
    }
    if (outcome.type === 'place') {
      if (outcome.place < 1 || outcome.place > maxPlace) {
        return null;
      }
      if (usedPlaces.has(outcome.place)) {
        return null;
      }
      usedPlaces.add(outcome.place);
    }
  }

  return players.map((player, index) => {
    const outcome = outcomes[index]!;
    return {
      playerId: player.id,
      outcome,
      points: pointsFromOutcome(outcome, maxPlace),
    };
  });
}

export function outcomeLabel(outcome: TableOutcome): string {
  if (outcome.type === 'tie') {
    return 'Empate (1 pt)';
  }
  const labels: Record<number, string> = {
    1: '1º Lugar',
    2: '2º Lugar',
    3: '3º Lugar',
    4: '4º Lugar',
  };
  return labels[outcome.place] ?? `${outcome.place}º`;
}
