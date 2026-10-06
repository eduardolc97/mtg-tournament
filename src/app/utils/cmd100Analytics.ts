import type { Tournament } from '../types/tournament';
import { calculatePlayerStats, playerStatsAreTied } from './tournamentRanking';
import { plannedTotalRounds } from '../constants/tournamentModality';
import { TABLE_FIRST_PLACE_POINTS } from './scoring';

export interface AnalyticsRow {
  id: string;
  label: string;
  count: number;
  rank: number;
  winDates?: string[];
}

export interface DateAttendance {
  date: string;
  label: string;
  count: number;
}

export interface Cmd100Analytics {
  tournamentCount: number;
  datesByAttendance: DateAttendance[];
  playersByAttendance: AnalyticsRow[];
  playersByTableWins: AnalyticsRow[];
  playersByTournamentWins: AnalyticsRow[];
}

const eventDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function eventDateKey(date: Date): string | null {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return null;
  const parts = eventDateFormatter.formatToParts(value);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : null;
}

function formatEventDate(key: string): string {
  const [year, month, day] = key.split('-');
  return `${day}/${month}/${year}`;
}

export function availableCmd100Months(tournaments: Tournament[]): string[] {
  const months = tournaments
    .filter((tournament) => tournament.modality === 'weekly_cmd100')
    .map((tournament) => eventDateKey(tournament.createdAt)?.slice(0, 7))
    .filter((month): month is string => Boolean(month));
  return [...new Set(months)].sort((a, b) => b.localeCompare(a));
}

export function latestCmd100Month(tournaments: Tournament[]): string | null {
  return availableCmd100Months(tournaments)[0] ?? null;
}

function isCompleteTable(table: Tournament['rounds'][number]['tables'][number]): boolean {
  if (!table.results || table.players.length === 0) return false;
  const playerIds = new Set(table.players.map((player) => player.id));
  return (
    table.results.length === playerIds.size &&
    new Set(table.results.map((result) => result.playerId)).size === playerIds.size &&
    table.results.every((result) => playerIds.has(result.playerId))
  );
}

function isCompleteTournament(tournament: Tournament): boolean {
  const expectedRounds = plannedTotalRounds(
    tournament.modality,
    tournament.players.length,
    tournament.doublesIncludeFourthSwissRound,
    tournament.openTableIncludeFourthRound
  );
  return (
    Array.from({ length: expectedRounds }, (_, index) => index + 1).every(
      (number) => tournament.rounds.some(
        (round) => round.number === number && round.tables.length > 0 && round.tables.every(isCompleteTable)
      )
    )
  );
}

function ranked(rows: Omit<AnalyticsRow, 'rank'>[]): AnalyticsRow[] {
  rows.sort((a, b) =>
    b.count - a.count || a.label.localeCompare(b.label, 'pt-BR') || a.id.localeCompare(b.id)
  );
  let rank = 0;
  return rows.map((row, index) => {
    if (index === 0 || row.count !== rows[index - 1].count) rank = index + 1;
    return { ...row, rank };
  });
}

export function aggregateCmd100Analytics(tournaments: Tournament[], monthKey?: string): Cmd100Analytics {
  const cmd100 = tournaments.filter((tournament) =>
    tournament.modality === 'weekly_cmd100' &&
    (!monthKey || eventDateKey(tournament.createdAt)?.startsWith(`${monthKey}-`))
  );
  const players = new Map<string, { label: string; attendance: number; tableWins: number; tournamentWins: number; tournamentWinDates: string[] }>();
  const dates = new Map<string, Set<string>>();

  for (const tournament of cmd100) {
    const dateKey = eventDateKey(tournament.createdAt);
    const entryToPlayer = new Map(tournament.players.map((player) => [player.id, player.playerId]));
    const uniquePlayers = new Set(tournament.players.map((player) => player.playerId));
    for (const player of tournament.players) {
      const current = players.get(player.playerId) ?? {
        label: player.name,
        attendance: 0,
        tableWins: 0,
        tournamentWins: 0,
        tournamentWinDates: [],
      };
      current.label = player.name;
      players.set(player.playerId, current);
    }
    for (const playerId of uniquePlayers) {
      const current = players.get(playerId);
      if (current) current.attendance += 1;
    }

    if (dateKey) {
      const onDate = dates.get(dateKey) ?? new Set<string>();
      uniquePlayers.forEach((playerId) => onDate.add(playerId));
      dates.set(dateKey, onDate);
    }

    for (const round of tournament.rounds) {
      for (const table of round.tables) {
        if (!isCompleteTable(table)) continue;
        for (const result of table.results!) {
          const isFirstPlace =
            (result.outcome.type === 'place' && result.outcome.place === 1) ||
            result.points === TABLE_FIRST_PLACE_POINTS;
          if (!isFirstPlace) continue;
          const playerId = entryToPlayer.get(result.playerId);
          const current = playerId ? players.get(playerId) : undefined;
          if (current) current.tableWins += 1;
        }
      }
    }

    if (isCompleteTournament(tournament)) {
      const stats = calculatePlayerStats(tournament);
      const leader = stats[0];
      if (leader && leader.totalPoints > 0) {
        for (const stat of stats) {
          if (!playerStatsAreTied(stat, leader)) break;
          const playerId = entryToPlayer.get(stat.playerId);
          const current = playerId ? players.get(playerId) : undefined;
          if (current) {
            current.tournamentWins += 1;
            if (dateKey) current.tournamentWinDates.push(dateKey);
          }
        }
      }
    }
  }

  const playerRows = [...players.entries()];
  const playerRanking = (metric: 'attendance' | 'tableWins' | 'tournamentWins') =>
    ranked(playerRows
      .filter(([, value]) => metric === 'attendance' || value[metric] > 0)
      .map(([id, value]) => ({
        id,
        label: value.label,
        count: value[metric],
        ...(metric === 'tournamentWins' ? {
          winDates: value.tournamentWinDates
            .slice()
            .sort((a, b) => b.localeCompare(a))
            .map(formatEventDate),
        } : {}),
      })));

  return {
    tournamentCount: cmd100.length,
    datesByAttendance: [...dates.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, playerIds]) => ({
      date,
      label: formatEventDate(date),
      count: playerIds.size,
    })),
    playersByAttendance: playerRanking('attendance'),
    playersByTableWins: playerRanking('tableWins'),
    playersByTournamentWins: playerRanking('tournamentWins'),
  };
}
