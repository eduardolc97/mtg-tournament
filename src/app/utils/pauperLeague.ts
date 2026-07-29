import type { Tournament } from '../types/tournament';
import { countsTowardPauperLeague } from '../constants/tournamentModality';
import {
  calculatePauperPlayerStats,
  computePauperTournamentPoints,
  getPauperRecordFromPlayer,
  pauperPlayerStatsAreTied,
} from './pauperScoring';
import { monthLabelUppercase } from './monthlyLeague';

export interface PauperLeagueRow {
  key: string;
  displayName: string;
  fullName?: string | null;
  totalPointsInMonth: number;
  avgPerformancePct: number;
}

export function pauperLeagueRowsAreTied(
  a: PauperLeagueRow,
  b: PauperLeagueRow
): boolean {
  return (
    a.totalPointsInMonth === b.totalPointsInMonth &&
    a.avgPerformancePct === b.avgPerformancePct
  );
}

export function aggregatePauperLeague(
  tournaments: Tournament[],
  leagueYear: number,
  leagueMonth: number
): PauperLeagueRow[] {
  const inMonth = tournaments.filter(
    (t) =>
      t.leagueYear === leagueYear &&
      t.leagueMonth === leagueMonth &&
      countsTowardPauperLeague(t.modality)
  );

  const byKey = new Map<
    string,
    {
      displayName: string;
      fullName?: string | null;
      totalPointsInMonth: number;
      performanceSum: number;
      performanceCount: number;
    }
  >();

  for (const t of inMonth) {
    const pointsDoubled = t.pointsDoubled === true;
    for (const p of t.players) {
      const key = p.playerId;
      if (!byKey.has(key)) {
        byKey.set(key, {
          displayName: p.name.trim(),
          fullName: p.fullName,
          totalPointsInMonth: 0,
          performanceSum: 0,
          performanceCount: 0,
        });
      }
      const row = byKey.get(key)!;
      const record = getPauperRecordFromPlayer(p);
      row.totalPointsInMonth += computePauperTournamentPoints(
        record,
        pointsDoubled
      );
      const pct = record.performancePct;
      if (pct !== null && Number.isFinite(pct)) {
        row.performanceSum += pct;
        row.performanceCount += 1;
      }
    }
  }

  const rows: PauperLeagueRow[] = [...byKey.entries()].map(([key, v]) => ({
    key,
    displayName: v.displayName,
    fullName: v.fullName,
    totalPointsInMonth: v.totalPointsInMonth,
    avgPerformancePct:
      v.performanceCount > 0 ? v.performanceSum / v.performanceCount : 0,
  }));

  rows.sort((a, b) => {
    if (b.totalPointsInMonth !== a.totalPointsInMonth) {
      return b.totalPointsInMonth - a.totalPointsInMonth;
    }
    if (b.avgPerformancePct !== a.avgPerformancePct) {
      return b.avgPerformancePct - a.avgPerformancePct;
    }
    return a.displayName.localeCompare(b.displayName, 'pt-BR');
  });

  return rows;
}

export function formatPauperTournamentRankingMessage(
  tournament: Tournament
): string {
  const stats = calculatePauperPlayerStats(
    tournament.players,
    tournament.pointsDoubled === true
  );
  const ranked = stats.filter((s) => s.totalPoints > 0);
  if (ranked.length === 0) {
    return `🏆 RANKING — ${tournament.name.toUpperCase()}\n\nNenhum resultado registrado ainda.`;
  }

  const lines: string[] = [
    `🏆 RANKING — ${tournament.name.toUpperCase()}`,
    '',
  ];

  const podiumMedals = ['🥇', '🥈', '🥉'] as const;
  const podiumCount = Math.min(3, ranked.length);
  for (let i = 0; i < podiumCount; i++) {
    const s = ranked[i];
    lines.push(`${podiumMedals[i]} ${i + 1}º Lugar`);
    lines.push(`${s.playerName} — ${s.totalPoints} pts`);
    lines.push('');
  }

  if (ranked.length > 3) {
    lines.push('━━━━━━━━━━━━━━━━');
    for (let i = 3; i < ranked.length; i++) {
      const s = ranked[i];
      lines.push(`${i + 1}° ${s.playerName} — ${s.totalPoints} pts`);
    }
  }

  return lines.join('\n').trimEnd();
}

const RANKING_COPY_SEPARATOR = '━━━━━━━━━━━━━━━━';
const PODIUM_MEDALS = ['🥇', '🥈', '🥉'] as const;

export function formatPauperLeagueRankingMessage(
  rows: PauperLeagueRow[],
  year: number,
  month: number
): string {
  const ranked = rows.filter((row) => row.totalPointsInMonth > 0);
  if (ranked.length === 0) {
    return `🏆 RANKING GERAL PAUPER — ${monthLabelUppercase(year, month)}\n\nNenhum resultado registrado ainda.`;
  }

  const lines: string[] = [
    `🏆 RANKING GERAL PAUPER — ${monthLabelUppercase(year, month)}`,
    '',
  ];

  const podiumCount = Math.min(3, ranked.length);
  for (let i = 0; i < podiumCount; i++) {
    const row = ranked[i];
    lines.push(`${PODIUM_MEDALS[i]} ${i + 1}º Lugar`);
    lines.push(`${row.displayName} — ${row.totalPointsInMonth} pts`);
    lines.push('');
  }

  if (ranked.length > 3) {
    lines.push(RANKING_COPY_SEPARATOR);
    lines.push('TOP 10');
    const topTenEnd = Math.min(10, ranked.length);
    for (let i = 3; i < topTenEnd; i++) {
      const row = ranked[i];
      lines.push(`${i + 1}° ${row.displayName} — ${row.totalPointsInMonth} pts`);
    }
  }

  if (ranked.length > 10) {
    lines.push(RANKING_COPY_SEPARATOR);
    for (let i = 10; i < ranked.length; i++) {
      const row = ranked[i];
      lines.push(`${i + 1}° ${row.displayName} — ${row.totalPointsInMonth} pts`);
    }
  }

  return lines.join('\n').trimEnd();
}

export { pauperPlayerStatsAreTied };
