import { Player, Round, Table } from '../types/tournament';

export { POINTS_MAP } from './scoring';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function isValidTournamentPlayerCount(playerCount: number): boolean {
  if (playerCount < 3) {
    return false;
  }
  for (let b = 0; b <= 3; b++) {
    const rest = playerCount - 3 * b;
    if (rest < 0) {
      continue;
    }
    if (rest % 4 === 0) {
      return true;
    }
  }
  return false;
}

export function computeTableSizes(playerCount: number): number[] {
  if (playerCount < 3) {
    throw new Error('At least 3 players are required');
  }
  for (let b = 0; b <= 3; b++) {
    const rest = playerCount - 3 * b;
    if (rest < 0) {
      continue;
    }
    if (rest % 4 === 0) {
      const a = rest / 4;
      const sizes: number[] = [];
      for (let i = 0; i < a; i++) {
        sizes.push(4);
      }
      for (let i = 0; i < b; i++) {
        sizes.push(3);
      }
      sizes.sort((x, y) => y - x);
      return sizes;
    }
  }
  throw new Error(
    `Não é possível formar mesas só com 3 ou 4 jogadores (${playerCount} jogadores). Ex.: 5 jogadores não fecha — use 4, 6 ou outro total.`
  );
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}

export function buildPairRepeatMap(previousRounds: Round[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const round of previousRounds) {
    for (const table of round.tables) {
      const ids = table.players.map((p) => p.id);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const k = pairKey(ids[i], ids[j]);
          map.set(k, (map.get(k) ?? 0) + 1);
        }
      }
    }
  }
  return map;
}

function tablePairCost(ids: string[], pairMap: Map<string, number>): number {
  let cost = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      cost += pairMap.get(pairKey(ids[i], ids[j])) ?? 0;
    }
  }
  return cost;
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

function pickBestTable(
  remaining: Player[],
  size: number,
  pairMap: Map<string, number>
): Player[] {
  if (remaining.length === size) {
    return [...remaining];
  }
  const combs = combinationsIndices(remaining.length, size);
  let best: Player[] | null = null;
  let bestCost = Infinity;
  for (const idxs of combs) {
    const players = idxs.map((i) => remaining[i]);
    const cost = tablePairCost(
      players.map((p) => p.id),
      pairMap
    );
    if (cost < bestCost) {
      bestCost = cost;
      best = players;
    }
  }
  return best ?? remaining.slice(0, size);
}

function removePlayers(pool: Player[], toRemove: Player[]): Player[] {
  const ids = new Set(toRemove.map((p) => p.id));
  return pool.filter((p) => !ids.has(p.id));
}

function optimizeRoundTablesSwap(tables: Table[], pairMap: Map<string, number>): void {
  let improved = true;
  while (improved) {
    improved = false;
    for (let a = 0; a < tables.length; a++) {
      for (let b = a + 1; b < tables.length; b++) {
        const ta = tables[a].players;
        const tb = tables[b].players;
        for (let i = 0; i < ta.length; i++) {
          for (let j = 0; j < tb.length; j++) {
            const before =
              tablePairCost(
                ta.map((p) => p.id),
                pairMap
              ) + tablePairCost(
                tb.map((p) => p.id),
                pairMap
              );
            const ta2 = [...ta];
            const tb2 = [...tb];
            [ta2[i], tb2[j]] = [tb2[j], ta2[i]];
            const after =
              tablePairCost(
                ta2.map((p) => p.id),
                pairMap
              ) + tablePairCost(
                tb2.map((p) => p.id),
                pairMap
              );
            if (after < before) {
              tables[a] = { ...tables[a], players: ta2 };
              tables[b] = { ...tables[b], players: tb2 };
              improved = true;
            }
          }
        }
      }
    }
  }
}

export function buildTablesForRound(
  players: Player[],
  roundNumber: number,
  startingTableNumber: number,
  previousRounds: Round[]
): Table[] {
  const sizes = computeTableSizes(players.length);
  const pairMap = buildPairRepeatMap(previousRounds);
  let pool = shuffleArray([...players]);
  const tables: Table[] = [];
  let tableNumber = startingTableNumber;

  for (const size of sizes) {
    const chosen = pickBestTable(pool, size, pairMap);
    tables.push({
      id: `round-${roundNumber}-table-${tableNumber}`,
      players: chosen,
    });
    tableNumber++;
    pool = removePlayers(pool, chosen);
  }

  optimizeRoundTablesSwap(tables, pairMap);
  return tables;
}

function generateRoundWithPairing(
  players: Player[],
  roundNumber: number,
  previousRounds: Round[]
): Round {
  const tables = buildTablesForRound(players, roundNumber, 1, previousRounds);
  return {
    id: `round-${roundNumber}`,
    number: roundNumber,
    tables,
  };
}

export function generateSwissRoundsOneAndTwo(players: Player[]): Round[] {
  const rounds: Round[] = [];
  const r1 = generateRoundWithPairing(players, 1, []);
  rounds.push(r1);
  const r2 = generateRoundWithPairing(players, 2, rounds);
  rounds.push(r2);
  return rounds;
}

export function generateRounds(players: Player[]): Round[] {
  return generateSwissRoundsOneAndTwo(players);
}
