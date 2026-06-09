import type { Tournament } from '../types/tournament';
import { countsTowardMonthlyLeague } from '../constants/tournamentModality';
import { calculatePlayerStats } from './tournamentRanking';

export interface MonthlyLeagueRow {
  key: string;
  displayName: string;
  fullName?: string | null;
  totalPointsInMonth: number;
  firstPlaceCount: number;
  tournamentsPlayed: number;
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
        row.tournamentsPlayed += 1;
      }
    }

    if (stats.length > 0 && stats[0].totalPoints > 0) {
      const winnerGlobalId = entryToGlobal.get(stats[0].playerId);
      if (winnerGlobalId) {
        const row = byKey.get(winnerGlobalId);
        if (row) {
          row.firstPlaceCount += 1;
        }
      }
    }
  }

  const rows: MonthlyLeagueRow[] = [...byKey.entries()].map(([key, v]) => ({
    key,
    displayName: v.displayName,
    fullName: v.fullName,
    totalPointsInMonth: v.totalPointsInMonth,
    firstPlaceCount: v.firstPlaceCount,
    tournamentsPlayed: v.tournamentsPlayed,
  }));

  rows.sort((a, b) => {
    if (b.totalPointsInMonth !== a.totalPointsInMonth) {
      return b.totalPointsInMonth - a.totalPointsInMonth;
    }
    if (b.firstPlaceCount !== a.firstPlaceCount) {
      return b.firstPlaceCount - a.firstPlaceCount;
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
