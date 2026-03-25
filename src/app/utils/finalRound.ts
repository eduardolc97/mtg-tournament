import type { Player, Round, Table, Tournament } from '../types/tournament';
import { expectedSwissRoundsForTournament } from './tournamentSwiss';
import {
  buildDoublesTablesForTeams,
  getDoublesTeamsFromPlayers,
  type DoublesTeam,
} from './doublesRoundGenerator';
import { buildTablesForRound, pairKey } from './roundGenerator';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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

function pickTopTwoTeamsWithTieRandom(
  teamsSorted: { team: DoublesTeam; pts: number }[]
): DoublesTeam[] {
  const selected: DoublesTeam[] = [];
  let i = 0;
  while (selected.length < 2 && i < teamsSorted.length) {
    const score = teamsSorted[i].pts;
    const group: DoublesTeam[] = [];
    while (
      i < teamsSorted.length &&
      teamsSorted[i].pts === score
    ) {
      group.push(teamsSorted[i].team);
      i++;
    }
    if (selected.length + group.length <= 2) {
      selected.push(...group);
    } else {
      const need = 2 - selected.length;
      const shuffled = shuffleArray([...group]);
      selected.push(...shuffled.slice(0, need));
      break;
    }
  }
  return selected;
}

function pickTopFourWithTieRandom(
  sortedByPoints: Player[],
  points: Map<string, number>
): Player[] {
  const selected: Player[] = [];
  let i = 0;
  while (selected.length < 4 && i < sortedByPoints.length) {
    const score = points.get(sortedByPoints[i].id) ?? 0;
    const group: Player[] = [];
    while (
      i < sortedByPoints.length &&
      (points.get(sortedByPoints[i].id) ?? 0) === score
    ) {
      group.push(sortedByPoints[i]);
      i++;
    }
    if (selected.length + group.length <= 4) {
      selected.push(...group);
    } else {
      const need = 4 - selected.length;
      const shuffled = shuffleArray([...group]);
      selected.push(...shuffled.slice(0, need));
      break;
    }
  }
  return selected;
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
  const ranked = teams
    .map((team) => {
      const pa = points.get(team.a.id) ?? 0;
      const pb = points.get(team.b.id) ?? 0;
      const pts = pa === pb ? pa : Math.round((pa + pb) / 2);
      return { team, pts };
    })
    .sort((x, y) => {
      if (y.pts !== x.pts) {
        return y.pts - x.pts;
      }
      const nx = `${x.team.a.name} / ${x.team.b.name}`;
      const ny = `${y.team.a.name} / ${y.team.b.name}`;
      return nx.localeCompare(ny, 'pt-BR');
    });

  const finalists = pickTopTwoTeamsWithTieRandom(ranked);
  const previousRounds = tournament.rounds;

  const finalistTeamKeys = new Set(
    finalists.map((t) => pairKey(t.a.id, t.b.id))
  );
  const restTeams = teams.filter(
    (t) => !finalistTeamKeys.has(pairKey(t.a.id, t.b.id))
  );

  const tables: Table[] = [];

  if (finalists.length >= 2) {
    const [f1, f2] = finalists;
    tables.push({
      id: `round-${outputRoundNumber}-table-1`,
      players: [f1.a, f1.b, f2.a, f2.b],
      isFinalTable: leadersTableFlags.isFinalTable,
      isLeadersTable: leadersTableFlags.isLeadersTable,
    });
  } else if (finalists.length === 1) {
    const t = finalists[0];
    tables.push({
      id: `round-${outputRoundNumber}-table-1`,
      players: [t.a, t.b],
      isFinalTable: leadersTableFlags.isFinalTable,
      isLeadersTable: leadersTableFlags.isLeadersTable,
    });
  }

  if (restTeams.length > 0) {
    const startNum = tables.length + 1;
    const side = buildDoublesTablesForTeams(
      restTeams,
      outputRoundNumber,
      previousRounds,
      startNum
    );
    tables.push(...side);
  }

  return tables;
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
  const previousRounds = tournament.rounds;
  const points = aggregatePointsThroughRound(tournament, swiss);
  const sorted = [...tournament.players].sort((a, b) => {
    const pa = points.get(a.id) ?? 0;
    const pb = points.get(b.id) ?? 0;
    if (pb !== pa) {
      return pb - pa;
    }
    return a.name.localeCompare(b.name, 'pt-BR');
  });

  const finalists = pickTopFourWithTieRandom(sorted, points);
  const finalistIds = new Set(finalists.map((p) => p.id));
  const rest = tournament.players.filter((p) => !finalistIds.has(p.id));
  const finalRoundNumber = swiss + 1;

  const tables: Table[] = [];

  tables.push({
    id: `round-${finalRoundNumber}-table-1`,
    players: finalists,
    isFinalTable: true,
  });

  if (rest.length >= 3) {
    tables.push(
      ...buildTablesForRound(rest, finalRoundNumber, 2, previousRounds)
    );
  } else if (rest.length === 2) {
    tables.push({
      id: `round-${finalRoundNumber}-table-2`,
      players: [...rest],
      isFinalTable: false,
    });
  } else if (rest.length === 1) {
    tables.push({
      id: `round-${finalRoundNumber}-table-2`,
      players: [rest[0]],
      isFinalTable: false,
    });
  }

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
