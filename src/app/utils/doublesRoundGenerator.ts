import type { Player, Round, Table } from '../types/tournament';
import { pairKey } from './roundGenerator';

export interface DoublesTeam {
  a: Player;
  b: Player;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function combinationsIndices(n: number, k: number): number[][] {
  const out: number[][] = [];
  const buf: number[] = [];
  function dfs(start: number) {
    if (buf.length === k) {
      out.push([...buf]);
      return;
    }
    for (let i = start; i <= n - (k - buf.length); i++) {
      buf.push(i);
      dfs(i + 1);
      buf.pop();
    }
  }
  dfs(0);
  return out;
}

export function assignDoublesPartners(players: Player[]): Player[] {
  if (players.length % 2 !== 0) {
    throw new Error('Número par de jogadores é necessário para duplas.');
  }
  const shuffled = shuffleArray([...players]);
  const result: Player[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const x = shuffled[i];
    const y = shuffled[i + 1];
    result.push({ ...x, partnerId: y.id });
    result.push({ ...y, partnerId: x.id });
  }
  return result;
}

export function pairedPlayersToTeams(players: Player[]): DoublesTeam[] {
  const teams: DoublesTeam[] = [];
  for (let i = 0; i < players.length; i += 2) {
    teams.push({ a: players[i], b: players[i + 1] });
  }
  return teams;
}

function teamEdgeKeyFromPlayers(players: Player[]): string {
  const tk1 = pairKey(players[0].id, players[1].id);
  const tk2 = pairKey(players[2].id, players[3].id);
  return pairKey(tk1, tk2);
}

export function buildDoublesTeamPairRepeatMap(
  previousRounds: Round[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const round of previousRounds) {
    for (const table of round.tables) {
      if (table.players.length !== 4) {
        continue;
      }
      const k = teamEdgeKeyFromPlayers(table.players);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
  }
  return map;
}

function tableMatchCost(
  t1: DoublesTeam,
  t2: DoublesTeam,
  pairMap: Map<string, number>
): number {
  const players = [t1.a, t1.b, t2.a, t2.b];
  const k = teamEdgeKeyFromPlayers(players);
  return pairMap.get(k) ?? 0;
}

function pickBestTeamMatch(
  pool: DoublesTeam[],
  pairMap: Map<string, number>
): [DoublesTeam, DoublesTeam] {
  if (pool.length === 2) {
    return [pool[0], pool[1]];
  }
  const combs = combinationsIndices(pool.length, 2);
  let bestI = 0;
  let bestJ = 1;
  let bestCost = Infinity;
  for (const [i, j] of combs) {
    const cost = tableMatchCost(pool[i], pool[j], pairMap);
    if (cost < bestCost) {
      bestCost = cost;
      bestI = i;
      bestJ = j;
    }
  }
  return [pool[bestI], pool[bestJ]];
}

function removeTeams(
  pool: DoublesTeam[],
  a: DoublesTeam,
  b: DoublesTeam
): DoublesTeam[] {
  const drop = new Set([pairKey(a.a.id, a.b.id), pairKey(b.a.id, b.b.id)]);
  return pool.filter(
    (t) => !drop.has(pairKey(t.a.id, t.b.id))
  );
}

function edgeRepeatCost(
  four: Player[],
  pairMap: Map<string, number>
): number {
  if (four.length !== 4) {
    return 0;
  }
  return pairMap.get(teamEdgeKeyFromPlayers(four)) ?? 0;
}

function optimizeDoublesTablesSwap(
  tables: Table[],
  pairMap: Map<string, number>
): void {
  let improved = true;
  while (improved) {
    improved = false;
    for (let x = 0; x < tables.length; x++) {
      for (let y = x + 1; y < tables.length; y++) {
        const px = tables[x].players;
        const py = tables[y].players;
        if (px.length !== 4 || py.length !== 4) {
          continue;
        }
        const t1x: DoublesTeam = { a: px[0], b: px[1] };
        const t2x: DoublesTeam = { a: px[2], b: px[3] };
        const t1y: DoublesTeam = { a: py[0], b: py[1] };
        const t2y: DoublesTeam = { a: py[2], b: py[3] };
        const before =
          edgeRepeatCost(px, pairMap) + edgeRepeatCost(py, pairMap);
        const matchups: [DoublesTeam, DoublesTeam][][] = [
          [
            [t1x, t1y],
            [t2x, t2y],
          ],
          [
            [t1x, t2y],
            [t2x, t1y],
          ],
        ];
        let bestAfter = before;
        let bestNx = px;
        let bestNy = py;
        for (const m of matchups) {
          const nx = [m[0][0].a, m[0][0].b, m[0][1].a, m[0][1].b];
          const ny = [m[1][0].a, m[1][0].b, m[1][1].a, m[1][1].b];
          const after =
            edgeRepeatCost(nx, pairMap) + edgeRepeatCost(ny, pairMap);
          if (after < bestAfter) {
            bestAfter = after;
            bestNx = nx;
            bestNy = ny;
          }
        }
        if (bestAfter < before) {
          tables[x] = { ...tables[x], players: bestNx };
          tables[y] = { ...tables[y], players: bestNy };
          improved = true;
        }
      }
    }
  }
}

export function buildDoublesTablesForTeams(
  teams: DoublesTeam[],
  roundNumber: number,
  previousRounds: Round[],
  startingTableNumber: number
): Table[] {
  if (teams.length === 0) {
    return [];
  }
  const pairMap = buildDoublesTeamPairRepeatMap(previousRounds);
  let pool = shuffleArray([...teams]);
  const tables: Table[] = [];
  let tableNumber = startingTableNumber;

  while (pool.length > 0) {
    const [t1, t2] = pickBestTeamMatch(pool, pairMap);
    tables.push({
      id: `round-${roundNumber}-table-${tableNumber}`,
      players: [t1.a, t1.b, t2.a, t2.b],
    });
    tableNumber++;
    pool = removeTeams(pool, t1, t2);
  }

  optimizeDoublesTablesSwap(tables, pairMap);
  return tables;
}

function buildDoublesRound(
  teams: DoublesTeam[],
  roundNumber: number,
  previousRounds: Round[],
  startingTableNumber: number
): Round {
  const tables = buildDoublesTablesForTeams(
    teams,
    roundNumber,
    previousRounds,
    startingTableNumber
  );
  return {
    id: `round-${roundNumber}`,
    number: roundNumber,
    tables,
  };
}

export function isValidDoublesPlayerCount(count: number): boolean {
  return count >= 4 && count % 4 === 0;
}

export function generateDoublesSwissRounds(
  players: Player[],
  includeFourthSwissRound?: boolean | null
): {
  players: Player[];
  rounds: Round[];
} {
  if (!isValidDoublesPlayerCount(players.length)) {
    throw new Error(
      'CMD em duplas: use número de jogadores múltiplo de 4 (ex.: 8, 12, 16…).'
    );
  }
  const paired = assignDoublesPartners(players);
  const teams = pairedPlayersToTeams(paired);
  const duplas = teams.length;
  let swissCount: number;
  if (duplas < 8) {
    swissCount = 2;
  } else {
    swissCount = includeFourthSwissRound === true ? 4 : 3;
  }
  const rounds: Round[] = [];
  const preGeneratedSwiss = swissCount - 1;
  for (let r = 1; r <= preGeneratedSwiss; r++) {
    rounds.push(buildDoublesRound(teams, r, rounds, 1));
  }
  return { players: paired, rounds };
}

export function getDoublesTeamsFromPlayers(
  players: Player[]
): DoublesTeam[] {
  const teams: DoublesTeam[] = [];
  const seen = new Set<string>();
  for (const p of players) {
    if (!p.partnerId) {
      continue;
    }
    const k = pairKey(p.id, p.partnerId);
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    const buddy = players.find((x) => x.id === p.partnerId);
    if (!buddy) {
      continue;
    }
    teams.push({ a: p, b: buddy });
  }
  return teams;
}
