export interface PauperRecord {
  wins: number;
  losses: number;
  draws: number;
  performancePct: number | null;
}

export const DEFAULT_PAUPER_RECORD: PauperRecord = {
  wins: 0,
  losses: 0,
  draws: 0,
  performancePct: null,
};

const MAX_PAUPER_DIGIT = 9;

export function computePauperBasePoints(record: Pick<PauperRecord, 'wins' | 'draws'>): number {
  return record.wins * 3 + record.draws * 1;
}

export function computePauperTournamentPoints(
  record: Pick<PauperRecord, 'wins' | 'draws'>,
  pointsDoubled: boolean
): number {
  const base = computePauperBasePoints(record);
  return pointsDoubled ? base * 2 : base;
}

export function normalizePauperRecord(
  raw: Partial<PauperRecord> | null | undefined
): PauperRecord {
  const wins = Math.min(MAX_PAUPER_DIGIT, Math.max(0, Math.floor(raw?.wins ?? 0)));
  const losses = Math.min(MAX_PAUPER_DIGIT, Math.max(0, Math.floor(raw?.losses ?? 0)));
  const draws = Math.min(MAX_PAUPER_DIGIT, Math.max(0, Math.floor(raw?.draws ?? 0)));
  const pct = raw?.performancePct;
  let performancePct: number | null = null;
  if (typeof pct === 'number' && Number.isFinite(pct)) {
    performancePct = Math.min(100, Math.max(0, pct));
  }
  return { wins, losses, draws, performancePct };
}

export interface PauperPlayerStats {
  entryId: string;
  playerId: string;
  playerName: string;
  record: PauperRecord;
  totalPoints: number;
  performancePct: number;
}

export function getPauperRecordFromPlayer(
  player: { pauperRecord?: PauperRecord | null }
): PauperRecord {
  return normalizePauperRecord(player.pauperRecord ?? DEFAULT_PAUPER_RECORD);
}

export function calculatePauperPlayerStats(
  players: Array<{
    id: string;
    playerId: string;
    name: string;
    pauperRecord?: PauperRecord | null;
  }>,
  pointsDoubled: boolean
): PauperPlayerStats[] {
  const stats = players.map((player) => {
    const record = getPauperRecordFromPlayer(player);
    return {
      entryId: player.id,
      playerId: player.playerId,
      playerName: player.name,
      record,
      totalPoints: computePauperTournamentPoints(record, pointsDoubled),
      performancePct: record.performancePct ?? 0,
    };
  });

  stats.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    if (b.performancePct !== a.performancePct) {
      return b.performancePct - a.performancePct;
    }
    return a.playerName.localeCompare(b.playerName, 'pt-BR');
  });

  return stats;
}

export function pauperPlayerStatsAreTied(
  a: PauperPlayerStats,
  b: PauperPlayerStats
): boolean {
  return (
    a.totalPoints === b.totalPoints && a.performancePct === b.performancePct
  );
}

export function formatPauperRecordLabel(record: PauperRecord): string {
  return `${record.wins}/${record.losses}/${record.draws}`;
}
