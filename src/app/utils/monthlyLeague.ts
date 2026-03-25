import type { Tournament } from '../types/tournament';
import { countsTowardMonthlyLeague } from '../constants/tournamentModality';
import { calculatePlayerStats } from './tournamentRanking';

export interface MonthlyLeagueRow {
  key: string;
  displayName: string;
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
      totalPointsInMonth: number;
      firstPlaceCount: number;
      tournamentsPlayed: number;
    }
  >();

  for (const t of inMonth) {
    for (const p of t.players) {
      const key = playerNameKey(p.name);
      if (!byKey.has(key)) {
        byKey.set(key, {
          displayName: p.name.trim(),
          totalPointsInMonth: 0,
          firstPlaceCount: 0,
          tournamentsPlayed: 0,
        });
      }
    }

    const stats = calculatePlayerStats(t);
    for (const s of stats) {
      const key = playerNameKey(s.playerName);
      const row = byKey.get(key);
      if (row) {
        row.totalPointsInMonth += s.totalPoints;
        row.tournamentsPlayed += 1;
      }
    }

    if (stats.length > 0 && stats[0].totalPoints > 0) {
      const winnerKey = playerNameKey(stats[0].playerName);
      const row = byKey.get(winnerKey);
      if (row) {
        row.firstPlaceCount += 1;
      }
    }
  }

  const rows: MonthlyLeagueRow[] = [...byKey.entries()].map(([key, v]) => ({
    key,
    displayName: v.displayName,
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
