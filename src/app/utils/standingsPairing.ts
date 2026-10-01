import type { Player, Round, Table, Tournament } from '../types/tournament';
import { calculatePlayerStats, calculateDoublesTeamStats } from './tournamentRanking';
import { getDoublesTeamsFromPlayers } from './doublesRoundGenerator';
import { buildPairRepeatMap, computeTableSizes, pairKey } from './roundGenerator';

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function compareCost(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/** Bounded search with caller-defined restrictions on exchanging seats. */
function improveGroups<T>(
  initial: T[][],
  cost: (groups: T[][]) => number[],
  canSwap: (a: number, b: number, playerA: T, playerB: T) => boolean
): T[][] {
  const groups = initial.map(group => [...group]);
  let bestCost = cost(groups);
  const seats = groups.flatMap((group, table) => group.map((_, seat) => ({ table, seat })));
  for (let attempt = 0; attempt < Math.min(2400, seats.length * 60); attempt++) {
    const a = seats[Math.floor(Math.random() * seats.length)];
    const b = seats[Math.floor(Math.random() * seats.length)];
    if (a.table === b.table || !canSwap(a.table, b.table, groups[a.table][a.seat], groups[b.table][b.seat])) continue;
    [groups[a.table][a.seat], groups[b.table][b.seat]] =
      [groups[b.table][b.seat], groups[a.table][a.seat]];
    const candidate = cost(groups);
    if (compareCost(candidate, bestCost) < 0) {
      bestCost = candidate;
    } else {
      [groups[a.table][a.seat], groups[b.table][b.seat]] =
        [groups[b.table][b.seat], groups[a.table][a.seat]];
    }
  }
  return groups;
}

function makeRound(groups: Player[][], number: number, final: boolean): Round {
  return {
    id: `round-${number}`, number,
    tables: groups.map((players, i): Table => ({
      id: `round-${number}-table-${i + 1}`, players,
      ...(final && i === 0 ? { isFinalTable: true } : {}),
    })),
  };
}

/** R2 mixes nearby scores. R3 onwards follows accumulated standings strongly. */
export function buildSinglesStandingsRound(
  tournament: Tournament, number: number, final = false
): Round {
  const previousRounds = tournament.rounds.filter(round => round.number < number);
  const stats = calculatePlayerStats({ ...tournament, rounds: previousRounds });
  const byId = new Map(stats.map(row => [row.playerId, row]));
  const playersById = new Map(tournament.players.map(player => [player.id, player]));
  const ranked = stats.map(row => playersById.get(row.playerId)!);
  const sizes = computeTableSizes(ranked.length);
  const fourSeats = sizes.filter(size => size === 4).length * 4;
  const winners = ranked.filter(player => byId.get(player.id)!.tableWinCount > 0);
  const others = ranked.filter(player => byId.get(player.id)!.tableWinCount === 0);
  // In R2, diversity takes precedence over keeping every winner at a four-seat table.
  // Move winners to three-seat tables in pairs rather than isolating one there.
  let fourWinnerCount = Math.min(winners.length, fourSeats);
  if (number === 2 && sizes.includes(3)) {
    fourWinnerCount = Math.min(winners.length, (fourSeats / 4) * 2);
    if (winners.length - fourWinnerCount === 1 && fourWinnerCount > 0) fourWinnerCount--;
  }
  const fourIds = new Set([
    ...winners.slice(0, fourWinnerCount), ...others, ...winners.slice(fourWinnerCount),
  ].slice(0, fourSeats).map(player => player.id));
  const four = ranked.filter(player => fourIds.has(player.id));
  const three = ranked.filter(player => !fourIds.has(player.id));
  const partition = (fourPool: Player[], threePool: Player[]) => {
    let f = 0;
    let t = 0;
    return sizes.map(size => size === 4 ? fourPool.slice(f, f += 4) : threePool.slice(t, t += 3));
  };
  if (number >= 3) return makeRound(partition(four, three), number, final);

  const previousTables = new Set(previousRounds.flatMap(round => round.tables.map(table =>
    JSON.stringify(table.players.map(player => player.id).sort())
  )));
  const repeatPairs = buildPairRepeatMap(previousRounds);
  const score = (player: Player) => byId.get(player.id)!.totalPoints;
  const won = (player: Player) => byId.get(player.id)!.tableWinCount > 0;
  const cost = (groups: Player[][]): number[] => {
    let repeatedTables = 0;
    let isolatedWinners = 0;
    let concentratedWinners = 0;
    let repeats = 0;
    let distance = 0;
    let threePoints = 0;
    let excessWinners = 0;
    let loneThreeWinners = 0;
    for (const group of groups) {
      if (previousTables.has(JSON.stringify(group.map(player => player.id).sort()))) repeatedTables++;
      const wins = group.filter(won).length;
      excessWinners += Math.max(0, wins - 2);
      if (group.length === 3 && wins === 1) loneThreeWinners++;
      if (group.length === 3) threePoints += group.reduce((sum, player) => sum + score(player), 0);
      // A winner must have another winner or a nearby scorer, when feasible.
      if (wins === 1 && !group.some(player => !won(player) && score(player) >= 2)) isolatedWinners++;
      concentratedWinners += wins * wins;
      for (let a = 0; a < group.length; a++) {
        for (let b = a + 1; b < group.length; b++) {
          repeats += repeatPairs.get(pairKey(group[a].id, group[b].id)) ?? 0;
          distance += Math.abs(score(group[a]) - score(group[b]));
        }
      }
    }
    return [excessWinners, loneThreeWinners, repeatedTables, isolatedWinners, concentratedWinners, threePoints, repeats, distance];
  };
  let best = partition(four, three);
  let bestCost = cost(best);
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = improveGroups(partition(shuffle(four), shuffle(three)), cost,
      (a, b, playerA, playerB) => sizes[a] === sizes[b] || (!won(playerA) && !won(playerB)));
    const candidateCost = cost(candidate);
    if (compareCost(candidateCost, bestCost) < 0) {
      best = candidate;
      bestCost = candidateCost;
    }
  }
  // Put the strongest mixed table first without changing its membership.
  best.sort((a, b) => b.reduce((sum, p) => sum + score(p), 0) - a.reduce((sum, p) => sum + score(p), 0));
  return makeRound(best, number, final);
}

/** Pair fixed teams, preferring new opponents with nearby accumulated scores. */
export function buildDoublesStandingsRound(
  tournament: Tournament, number: number, final = false
): Round {
  const previousRounds = tournament.rounds.filter(round => round.number < number);
  const stats = calculateDoublesTeamStats({ ...tournament, rounds: previousRounds });
  const teamsByKey = new Map(getDoublesTeamsFromPlayers(tournament.players).map(team =>
    [pairKey(team.a.id, team.b.id), team] as const
  ));
  if (stats.length % 2 !== 0 || stats.length * 2 !== tournament.players.length) {
    throw new Error('As duplas devem estar completas e o número de duplas deve ser par.');
  }
  const pairTeams = (pool: typeof stats) => Array.from({ length: pool.length / 2 },
    (_, index) => pool.slice(index * 2, index * 2 + 2));
  let groups = pairTeams(stats);
  if (!final) {
    const previousPairs = new Map<string, number>();
    const playerTeam = new Map<string, string>();
    for (const [key, team] of teamsByKey) {
      playerTeam.set(team.a.id, key);
      playerTeam.set(team.b.id, key);
    }
    for (const round of previousRounds) {
      for (const table of round.tables) {
        const keys = [...new Set(table.players.map(player => playerTeam.get(player.id)))];
        if (keys.length === 2 && keys[0] && keys[1]) {
          const key = pairKey(keys[0], keys[1]);
          previousPairs.set(key, (previousPairs.get(key) ?? 0) + 1);
        }
      }
    }
    const cost = (pairs: typeof groups) => [
      pairs.reduce((sum, [a, b]) => sum + (previousPairs.get(pairKey(a.teamKey, b.teamKey)) ?? 0), 0),
      pairs.reduce((sum, [a, b]) => sum + Math.abs(a.totalPoints - b.totalPoints), 0),
    ];
    let bestCost = cost(groups);
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = improveGroups(attempt === 0 ? groups : pairTeams(shuffle(stats)), cost, () => true);
      const candidateCost = cost(candidate);
      if (compareCost(candidateCost, bestCost) < 0) {
        groups = candidate;
        bestCost = candidateCost;
      }
    }
  }
  const round = makeRound(groups.map(pair => pair.flatMap(row => {
    const team = teamsByKey.get(row.teamKey)!;
    return [team.a, team.b];
  })), number, final);
  if (final && round.tables[0]) round.tables[0].isLeadersTable = true;
  return round;
}
