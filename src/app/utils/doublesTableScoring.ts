import type { Player, TableResult } from '../types/tournament';
import { pointsFromOutcome } from './scoring';

export type DoublesMesaOutcome = 'team1_wins' | 'team2_wins' | 'tie';

const MAX_PLACE_TEAMS = 2;

export function buildDoublesTeamTableResults(
  players: Player[],
  mesa: DoublesMesaOutcome
): TableResult[] {
  if (players.length !== 4) {
    return [];
  }
  if (mesa === 'tie') {
    const tie = { type: 'tie' } as const;
    const pts = pointsFromOutcome(tie, MAX_PLACE_TEAMS);
    return players.map((p) => ({
      playerId: p.id,
      outcome: tie,
      points: pts,
    }));
  }
  const win = { type: 'place', place: 1 as const };
  const lose = { type: 'place', place: 2 as const };
  const wpts = pointsFromOutcome(win, MAX_PLACE_TEAMS);
  const lpts = pointsFromOutcome(lose, MAX_PLACE_TEAMS);
  if (mesa === 'team1_wins') {
    return [
      { playerId: players[0].id, outcome: win, points: wpts },
      { playerId: players[1].id, outcome: win, points: wpts },
      { playerId: players[2].id, outcome: lose, points: lpts },
      { playerId: players[3].id, outcome: lose, points: lpts },
    ];
  }
  return [
    { playerId: players[0].id, outcome: lose, points: lpts },
    { playerId: players[1].id, outcome: lose, points: lpts },
    { playerId: players[2].id, outcome: win, points: wpts },
    { playerId: players[3].id, outcome: win, points: wpts },
  ];
}

export function parseDoublesMesaOutcomeFromResults(
  results: TableResult[],
  players: Player[]
): DoublesMesaOutcome | null {
  if (results.length !== 4 || players.length !== 4) {
    return null;
  }
  const byId = new Map(results.map((r) => [r.playerId, r]));
  const outcomeOf = (id: string) => byId.get(id)?.outcome;
  const t1 = [players[0].id, players[1].id];
  const t2 = [players[2].id, players[3].id];
  const allTie = [...t1, ...t2].every(
    (id) => outcomeOf(id)?.type === 'tie'
  );
  if (allTie) {
    return 'tie';
  }
  const o0 = outcomeOf(players[0].id);
  if (o0?.type === 'place' && o0.place === 1) {
    return 'team1_wins';
  }
  if (o0?.type === 'place' && o0.place === 2) {
    return 'team2_wins';
  }
  return null;
}

export function mesaOutcomeLabelPt(mesa: DoublesMesaOutcome): string {
  switch (mesa) {
    case 'team1_wins':
      return 'Vitória da dupla 1';
    case 'team2_wins':
      return 'Vitória da dupla 2';
    case 'tie':
      return 'Empate entre duplas';
    default:
      return '';
  }
}
