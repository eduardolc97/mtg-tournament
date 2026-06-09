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
