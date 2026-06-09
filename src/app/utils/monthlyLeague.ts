import type { Tournament } from '../types/tournament';
import { countsTowardMonthlyLeague } from '../constants/tournamentModality';
import {
  calculatePlayerStats,
  playerStatsAreTied,
} from './tournamentRanking';

export interface MonthlyLeagueRow {
  key: string;
  displayName: string;
  fullName?: string | null;
  totalPointsInMonth: number;
  firstPlaceCount: number;
  tableFirstPlaceCount: number;
  tournamentsPlayed: number;
}

function countDailyWinsByGlobalId(
  tournament: Tournament,
  entryToGlobal: Map<string, string>
): Map<string, number> {
  const counts = new Map<string, number>();
  const stats = calculatePlayerStats(tournament);
  if (stats.length === 0 || stats[0].totalPoints <= 0) {
    return counts;
  }

  const leader = stats[0];
  for (const s of stats) {
    if (!playerStatsAreTied(s, leader)) {
      break;
    }
    const globalId = entryToGlobal.get(s.playerId);
    if (globalId) {
      counts.set(globalId, 1);
    }
  }

  return counts;
}

export function monthlyLeagueRowsAreTied(
  a: MonthlyLeagueRow,
  b: MonthlyLeagueRow
): boolean {
  return (
    a.totalPointsInMonth === b.totalPointsInMonth &&
    a.firstPlaceCount === b.firstPlaceCount &&
    a.tableFirstPlaceCount === b.tableFirstPlaceCount
  );
}

export function playerNameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function aggregateMonthlyLeague(
  tournaments: Tournament[],
  leagueYear: number,
  leagueMonth: number
): MonthlyLeagueRow[] {
  const inMonth = tournaments.filter(
    (t) =>
      t.leagueYear === leagueYear &&
      t.leagueMonth === leagueMonth &&
      countsTowardMonthlyLeague(t.modality)
  );

  const byKey = new Map<
    string,
    {
      displayName: string;
      fullName?: string | null;
      totalPointsInMonth: number;
      firstPlaceCount: number;
      tableFirstPlaceCount: number;
      tournamentsPlayed: number;
    }
  >();

  for (const t of inMonth) {
    for (const p of t.players) {
      const key = p.playerId;
      if (!byKey.has(key)) {
        byKey.set(key, {
          displayName: p.name.trim(),
          fullName: p.fullName,
          totalPointsInMonth: 0,
          firstPlaceCount: 0,
          tableFirstPlaceCount: 0,
          tournamentsPlayed: 0,
        });
      }
    }

    const stats = calculatePlayerStats(t);
    const entryToGlobal = new Map(
      t.players.map((p) => [p.id, p.playerId] as const)
    );

    for (const s of stats) {
      const globalId = entryToGlobal.get(s.playerId);
      if (!globalId) {
        continue;
      }
      const row = byKey.get(globalId);
      if (row) {
        row.totalPointsInMonth += s.totalPoints;
        row.tableFirstPlaceCount += s.fivePointTableCount;
        row.tournamentsPlayed += 1;
      }
    }

    const dailyWins = countDailyWinsByGlobalId(t, entryToGlobal);
    for (const [globalId, count] of dailyWins) {
      const row = byKey.get(globalId);
      if (row) {
        row.firstPlaceCount += count;
      }
    }
  }

  const rows: MonthlyLeagueRow[] = [...byKey.entries()].map(([key, v]) => ({
    key,
    displayName: v.displayName,
    fullName: v.fullName,
    totalPointsInMonth: v.totalPointsInMonth,
    firstPlaceCount: v.firstPlaceCount,
    tableFirstPlaceCount: v.tableFirstPlaceCount,
    tournamentsPlayed: v.tournamentsPlayed,
  }));

  rows.sort((a, b) => {
    if (b.totalPointsInMonth !== a.totalPointsInMonth) {
      return b.totalPointsInMonth - a.totalPointsInMonth;
    }
    if (b.firstPlaceCount !== a.firstPlaceCount) {
      return b.firstPlaceCount - a.firstPlaceCount;
    }
    if (b.tableFirstPlaceCount !== a.tableFirstPlaceCount) {
      return b.tableFirstPlaceCount - a.tableFirstPlaceCount;
    }
    return a.displayName.localeCompare(b.displayName, 'pt-BR');
  });

  return rows;
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

export function monthLabelUppercase(year: number, month: number): string {
  const monthName = new Date(year, month - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long' })
    .toUpperCase();
  return `${monthName} ${year}`;
}

const RANKING_COPY_SEPARATOR = '━━━━━━━━━━━━━━━━';

const PODIUM_MEDALS = ['🥇', '🥈', '🥉'] as const;

export function formatMonthlyLeagueRankingMessage(
  rows: MonthlyLeagueRow[],
  year: number,
  month: number
): string {
  const ranked = rows.filter((row) => row.totalPointsInMonth > 0);
  if (ranked.length === 0) {
    return `🏆 RANKING GERAL — ${monthLabelUppercase(year, month)}\n\nNenhum resultado registrado ainda.`;
  }

  const lines: string[] = [
    `🏆 RANKING GERAL — ${monthLabelUppercase(year, month)}`,
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
