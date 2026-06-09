import type { Round, Table, Tournament } from '../types/tournament';
import { expectedSwissRoundsForTournament } from './tournamentSwiss';
import {
  getDoublesTeamsFromPlayers,
  type DoublesTeam,
} from './doublesRoundGenerator';
import { buildScoreBalancedTables } from './roundGenerator';

export function aggregatePointsThroughRound(
  tournament: Tournament,
  upToRoundInclusive: number
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of tournament.players) {
    map.set(p.id, 0);
  }
  for (const round of tournament.rounds) {
    if (round.number > upToRoundInclusive) {
      break;
    }
    for (const table of round.tables) {
      if (!table.results || table.results.length !== table.players.length) {
        continue;
      }
      for (const r of table.results) {
        map.set(r.playerId, (map.get(r.playerId) ?? 0) + r.points);
      }
    }
  }
  return map;
}

function rankDoublesTeams(
  teams: DoublesTeam[],
  points: Map<string, number>
): DoublesTeam[] {
  return [...teams].sort((x, y) => {
    const pxa = points.get(x.a.id) ?? 0;
    const pxb = points.get(x.b.id) ?? 0;
    const pya = points.get(y.a.id) ?? 0;
    const pyb = points.get(y.b.id) ?? 0;
    const ptsX = pxa === pxb ? pxa : Math.round((pxa + pxb) / 2);
    const ptsY = pya === pyb ? pya : Math.round((pya + pyb) / 2);
    if (ptsY !== ptsX) {
      return ptsY - ptsX;
    }
    const nx = `${x.a.name} / ${x.b.name}`;
    const ny = `${y.a.name} / ${y.b.name}`;
    return nx.localeCompare(ny, 'pt-BR');
  });
}

function buildScoreBalancedDoublesTables(
  teams: DoublesTeam[],
  points: Map<string, number>,
  roundNumber: number,
  startingTableNumber: number,
  leadersTableFlags: { isFinalTable: boolean; isLeadersTable: boolean }
): Table[] {
  const ranked = rankDoublesTeams(teams, points);
  const tables: Table[] = [];
  let tableNumber = startingTableNumber;

  for (let i = 0; i < ranked.length; i += 2) {
    const t1 = ranked[i];
    const t2 = ranked[i + 1];
    const isFirst = i === 0;
    const players = t2
      ? [t1.a, t1.b, t2.a, t2.b]
      : [t1.a, t1.b];

    tables.push({
      id: `round-${roundNumber}-table-${tableNumber}`,
      players,
      ...(isFirst && leadersTableFlags.isFinalTable
        ? { isFinalTable: true }
        : {}),
      ...(isFirst && leadersTableFlags.isLeadersTable
        ? { isLeadersTable: true }
        : {}),
    });
    tableNumber++;
  }

  return tables;
}

function buildDoublesLeadersAndSideTables(
  tournament: Tournament,
  afterSwissRoundInclusive: number,
  outputRoundNumber: number,
  leadersTableFlags: { isFinalTable: boolean; isLeadersTable: boolean }
): Table[] {
  const points = aggregatePointsThroughRound(
    tournament,
    afterSwissRoundInclusive
  );
  const teams = getDoublesTeamsFromPlayers(tournament.players);
  return buildScoreBalancedDoublesTables(
    teams,
    points,
    outputRoundNumber,
    1,
    leadersTableFlags
  );
}

export function buildDoublesLastSwissRound(
  tournament: Tournament,
  swissCount: number
): Round {
  if (swissCount < 2) {
    throw new Error('CMD em duplas: são necessárias pelo menos 2 rodadas.');
  }
  const afterSwiss = swissCount - 1;
  const tables = buildDoublesLeadersAndSideTables(
    tournament,
    afterSwiss,
    swissCount,
    { isFinalTable: true, isLeadersTable: true }
  );
  return {
    id: `round-${swissCount}`,
    number: swissCount,
    tables,
  };
}

export function buildFinalRoundForTournament(tournament: Tournament): Round {
  return buildRoundThree(tournament);
}

export function buildRoundThree(tournament: Tournament): Round {
  const swiss = expectedSwissRoundsForTournament(tournament);
  const points = aggregatePointsThroughRound(tournament, swiss);
  const finalRoundNumber = swiss + 1;

  const tables = buildScoreBalancedTables(
    tournament.players,
    points,
    finalRoundNumber,
    1,
    { isFinalTable: true }
  );

  return {
    id: `round-${finalRoundNumber}`,
    number: finalRoundNumber,
    tables,
  };
}

export function isRoundFullyScored(round: Round | undefined): boolean {
  if (!round || round.tables.length === 0) {
    return false;
  }
  return round.tables.every(
    (t) => t.results && t.results.length === t.players.length
  );
}
