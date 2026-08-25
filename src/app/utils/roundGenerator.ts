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

export function computeFlexibleTableSizes(playerCount: number): number[] {
  if (playerCount < 1) {
    throw new Error('At least 1 player is required');
  }
  if (playerCount <= 2) {
    return [playerCount];
  }
  if (isValidTournamentPlayerCount(playerCount)) {
    return computeTableSizes(playerCount);
  }
  if (playerCount === 5) {
    return [3, 2];
  }
  if (playerCount > 3) {
    const rest = playerCount - 3;
    if (rest <= 2) {
      return [3, rest].sort((x, y) => y - x);
    }
    try {
      return [3, ...computeTableSizes(rest)].sort((x, y) => y - x);
    } catch {
      return [3, ...computeFlexibleTableSizes(rest)].sort((x, y) => y - x);
    }
  }
  return [playerCount];
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

function buildTablesFromSizes(
  players: Player[],
  sizes: number[],
  roundNumber: number,
  startingTableNumber: number,
  previousRounds: Round[]
): Table[] {
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

export function buildTablesForRound(
  players: Player[],
  roundNumber: number,
  startingTableNumber: number,
  previousRounds: Round[]
): Table[] {
  return buildTablesFromSizes(
    players,
    computeTableSizes(players.length),
    roundNumber,
    startingTableNumber,
    previousRounds
  );
}

export function buildFlexibleTablesForRound(
  players: Player[],
  roundNumber: number,
  startingTableNumber: number,
  previousRounds: Round[]
): Table[] {
  return buildTablesFromSizes(
    players,
    computeFlexibleTableSizes(players.length),
    roundNumber,
    startingTableNumber,
    previousRounds
  );
}

export function sortPlayersByPoints(
  players: Player[],
  points: Map<string, number>
): Player[] {
  return [...players].sort((a, b) => {
    const pa = points.get(a.id) ?? 0;
    const pb = points.get(b.id) ?? 0;
    if (pb !== pa) {
      return pb - pa;
    }
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

function resolveTableSizesForCount(playerCount: number): number[] {
  try {
    return computeTableSizes(playerCount);
  } catch {
    return computeFlexibleTableSizes(playerCount);
  }
}

export function buildScoreBalancedTables(
  players: Player[],
  points: Map<string, number>,
  roundNumber: number,
  startingTableNumber: number,
  firstTableFlags?: { isFinalTable?: boolean; isLeadersTable?: boolean }
): Table[] {
  const sorted = sortPlayersByPoints(players, points);
  const sizes = resolveTableSizesForCount(players.length);
  const tables: Table[] = [];
  let idx = 0;
  let tableNumber = startingTableNumber;

  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    const slice = sorted.slice(idx, idx + size);
    idx += size;
    const isFirst = i === 0;
    tables.push({
      id: `round-${roundNumber}-table-${tableNumber}`,
      players: slice,
      ...(isFirst && firstTableFlags?.isFinalTable
        ? { isFinalTable: true }
        : {}),
      ...(isFirst && firstTableFlags?.isLeadersTable
        ? { isLeadersTable: true }
        : {}),
    });
    tableNumber++;
  }

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
  return generateSwissRounds(players, 2);
}

type PairingScheduleScore = {
  repeatedCompleteTables: number;
  repeatedTrios: number;
  pairRepeatPenalty: number;
  threePlayerTableSpread: number;
  threePlayerTablePenalty: number;
};

export type PairingScheduleMetrics = PairingScheduleScore & {
  maximumPairMeetings: number;
  threePlayerTableAppearances: Record<string, number>;
};

type PairingScheduleCandidate = {
  rounds: Round[];
  score: PairingScheduleScore;
};

const PAIRING_SCHEDULE_ATTEMPTS = 1200;
const RANDOM_FINALIST_COUNT = 8;

function groupKey(ids: string[]): string {
  return [...ids].sort().join('\0');
}

function tableTriples(ids: string[]): string[] {
  if (ids.length < 3) {
    return [];
  }
  const triples: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      for (let k = j + 1; k < ids.length; k++) {
        triples.push(groupKey([ids[i], ids[j], ids[k]]));
      }
    }
  }
  return triples;
}

function repeatPenalty(count: number): number {
  if (count <= 1) {
    return 0;
  }
  const repeats = count - 1;
  return repeats * repeats;
}

export function analyzePairingSchedule(
  rounds: Round[],
  players: Player[]
): PairingScheduleMetrics {
  const completeTables = new Map<string, number>();
  const trios = new Map<string, number>();
  const pairs = new Map<string, number>();
  const threePlayerTableCounts = new Map(
    players.map((player) => [player.id, 0])
  );

  for (const round of rounds) {
    for (const table of round.tables) {
      const ids = table.players.map((player) => player.id);
      const completeKey = groupKey(ids);
      completeTables.set(
        completeKey,
        (completeTables.get(completeKey) ?? 0) + 1
      );

      for (const triple of tableTriples(ids)) {
        trios.set(triple, (trios.get(triple) ?? 0) + 1);
      }

      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const key = pairKey(ids[i], ids[j]);
          pairs.set(key, (pairs.get(key) ?? 0) + 1);
        }
      }

      if (ids.length === 3) {
        for (const id of ids) {
          threePlayerTableCounts.set(
            id,
            (threePlayerTableCounts.get(id) ?? 0) + 1
          );
        }
      }
    }
  }

  const tableThreeValues = [...threePlayerTableCounts.values()];
  const minimumThreePlayerTables = Math.min(...tableThreeValues);
  const maximumThreePlayerTables = Math.max(...tableThreeValues);

  return {
    repeatedCompleteTables: [...completeTables.values()].reduce(
      (total, count) => total + Math.max(0, count - 1),
      0
    ),
    repeatedTrios: [...trios.values()].reduce(
      (total, count) => total + Math.max(0, count - 1),
      0
    ),
    pairRepeatPenalty: [...pairs.values()].reduce(
      (total, count) => total + repeatPenalty(count),
      0
    ),
    maximumPairMeetings: Math.max(0, ...pairs.values()),
    threePlayerTableSpread:
      maximumThreePlayerTables - minimumThreePlayerTables,
    threePlayerTablePenalty: tableThreeValues.reduce(
      (total, count) => total + count * count,
      0
    ),
    threePlayerTableAppearances: Object.fromEntries(threePlayerTableCounts),
  };
}

function compareScheduleScores(
  a: PairingScheduleScore,
  b: PairingScheduleScore
): number {
  return (
    a.repeatedCompleteTables - b.repeatedCompleteTables ||
    a.repeatedTrios - b.repeatedTrios ||
    a.threePlayerTableSpread - b.threePlayerTableSpread ||
    a.threePlayerTablePenalty - b.threePlayerTablePenalty ||
    a.pairRepeatPenalty - b.pairRepeatPenalty
  );
}

function buildRandomSchedule(players: Player[], roundCount: number): Round[] {
  const sizes = computeTableSizes(players.length);
  const rounds: Round[] = [];
  const threePlayerTableCounts = new Map(
    players.map((player) => [player.id, 0])
  );
  const threePlayerSeatCount = sizes
    .filter((size) => size === 3)
    .reduce((total, size) => total + size, 0);

  for (let roundNumber = 1; roundNumber <= roundCount; roundNumber++) {
    const randomizedForThreePlayerTables = shuffleArray(players).sort(
      (a, b) =>
        (threePlayerTableCounts.get(a.id) ?? 0) -
        (threePlayerTableCounts.get(b.id) ?? 0)
    );
    const threePlayerTablePlayers = shuffleArray(
      randomizedForThreePlayerTables.slice(0, threePlayerSeatCount)
    );
    const threePlayerIds = new Set(
      threePlayerTablePlayers.map((player) => player.id)
    );
    const fourPlayerTablePlayers = shuffleArray(
      players.filter((player) => !threePlayerIds.has(player.id))
    );
    let threePlayerIndex = 0;
    let fourPlayerIndex = 0;
    const tables = sizes.map((size, tableIndex) => {
      const tablePlayers =
        size === 3
          ? threePlayerTablePlayers.slice(
              threePlayerIndex,
              threePlayerIndex + size
            )
          : fourPlayerTablePlayers.slice(
              fourPlayerIndex,
              fourPlayerIndex + size
            );
      if (size === 3) {
        threePlayerIndex += size;
        for (const player of tablePlayers) {
          threePlayerTableCounts.set(
            player.id,
            (threePlayerTableCounts.get(player.id) ?? 0) + 1
          );
        }
      } else {
        fourPlayerIndex += size;
      }
      return {
        id: `round-${roundNumber}-table-${tableIndex + 1}`,
        players: tablePlayers,
      };
    });
    rounds.push({
      id: `round-${roundNumber}`,
      number: roundNumber,
      tables,
    });
  }

  return rounds;
}

function generateDiverseRandomSchedule(
  players: Player[],
  roundCount: number
): Round[] {
  const candidates: PairingScheduleCandidate[] = [];

  for (let attempt = 0; attempt < PAIRING_SCHEDULE_ATTEMPTS; attempt++) {
    const rounds = buildRandomSchedule(players, roundCount);
    candidates.push({
      rounds,
      score: analyzePairingSchedule(rounds, players),
    });
  }

  candidates.sort((a, b) => compareScheduleScores(a.score, b.score));
  const best = candidates[0].score;
  const essentialFinalists = candidates.filter(
    (candidate) =>
      candidate.score.repeatedCompleteTables === best.repeatedCompleteTables &&
      candidate.score.repeatedTrios === best.repeatedTrios
  );
  const finalists = essentialFinalists.slice(0, RANDOM_FINALIST_COUNT);
  return finalists[Math.floor(Math.random() * finalists.length)].rounds;
}

export function generateSwissRounds(
  players: Player[],
  roundCount: number
): Round[] {
  return generateDiverseRandomSchedule(players, roundCount);
}

export function generateFlexibleSwissRoundsOneAndTwo(players: Player[]): Round[] {
  const rounds: Round[] = [];
  const r1Tables = buildFlexibleTablesForRound(players, 1, 1, []);
  rounds.push({
    id: 'round-1',
    number: 1,
    tables: r1Tables,
  });
  const r2Tables = buildFlexibleTablesForRound(players, 2, 1, rounds);
  rounds.push({
    id: 'round-2',
    number: 2,
    tables: r2Tables,
  });
  return rounds;
}

export function generateRounds(players: Player[]): Round[] {
  return generateSwissRoundsOneAndTwo(players);
}

export function assertStrictMesaSizes(tables: Table[]): void {
  for (const table of tables) {
    const count = table.players.length;
    if (count < 3 || count > 4) {
      throw new Error(
        `Mesa inválida com ${count} jogadores. Cada mesa deve ter entre 3 e 4 jogadores.`
      );
    }
  }
}
