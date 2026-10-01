import type {
  DoublesTeamStats,
  Tournament,
  PlayerStats,
} from '../types/tournament';
import { normalizeTournamentModality } from '../constants/tournamentModality';
import { getDoublesTeamsFromPlayers } from './doublesRoundGenerator';
import { pairKey } from './roundGenerator';
import { isTableWin } from './scoring';

function countTableWinsByPlayerId(
  tournament: Tournament
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const round of tournament.rounds) {
    for (const table of round.tables) {
      if (!table.results || table.results.length !== table.players.length) {
        continue;
      }
      for (const r of table.results) {
        if (!isTableWin(r)) {
          continue;
        }
        counts.set(r.playerId, (counts.get(r.playerId) ?? 0) + 1);
      }
    }
  }

  return counts;
}

export function comparePlayerStats(a: PlayerStats, b: PlayerStats): number {
  if (b.totalPoints !== a.totalPoints) {
    return b.totalPoints - a.totalPoints;
  }
  if (b.tableWinCount !== a.tableWinCount) {
    return b.tableWinCount - a.tableWinCount;
  }
  const maxRound = Math.max(a.pointsByRound.length, b.pointsByRound.length);
  for (let i = maxRound - 1; i >= 0; i--) {
    const pa = a.pointsByRound[i] ?? 0;
    const pb = b.pointsByRound[i] ?? 0;
    if (pb !== pa) {
      return pb - pa;
    }
  }
  return a.playerName.localeCompare(b.playerName, 'pt-BR');
}

export function playerStatsAreTied(a: PlayerStats, b: PlayerStats): boolean {
  if (a.totalPoints !== b.totalPoints) {
    return false;
  }
  if (a.tableWinCount !== b.tableWinCount) {
    return false;
  }
  const maxRound = Math.max(a.pointsByRound.length, b.pointsByRound.length);
  for (let i = 0; i < maxRound; i++) {
    if ((a.pointsByRound[i] ?? 0) !== (b.pointsByRound[i] ?? 0)) {
      return false;
    }
  }
  return true;
}

export interface RankingCompetitorSnapshot {
  name: string;
  totalPoints: number;
  tableWinCount: number;
  pointsByRound: number[];
}

export function playerStatsToSnapshot(
  stats: PlayerStats
): RankingCompetitorSnapshot {
  return {
    name: stats.playerName,
    totalPoints: stats.totalPoints,
    tableWinCount: stats.tableWinCount,
    pointsByRound: stats.pointsByRound,
  };
}

export function doublesTeamStatsToSnapshot(
  stats: DoublesTeamStats
): RankingCompetitorSnapshot {
  return {
    name: stats.label,
    totalPoints: stats.totalPoints,
    tableWinCount: stats.tableWinCount,
    pointsByRound: stats.pointsByRound,
  };
}

function rankingSnapshotsAreTied(
  a: RankingCompetitorSnapshot,
  b: RankingCompetitorSnapshot
): boolean {
  if (a.totalPoints !== b.totalPoints) {
    return false;
  }
  if (a.tableWinCount !== b.tableWinCount) {
    return false;
  }
  const maxRound = Math.max(a.pointsByRound.length, b.pointsByRound.length);
  for (let i = 0; i < maxRound; i++) {
    if ((a.pointsByRound[i] ?? 0) !== (b.pointsByRound[i] ?? 0)) {
      return false;
    }
  }
  return true;
}

function findDecisiveRoundDifference(
  winner: RankingCompetitorSnapshot,
  other: RankingCompetitorSnapshot
): { roundNumber: number; winnerPoints: number; otherPoints: number } | null {
  const maxRound = Math.max(
    winner.pointsByRound.length,
    other.pointsByRound.length
  );
  for (let i = maxRound - 1; i >= 0; i--) {
    const winnerPoints = winner.pointsByRound[i] ?? 0;
    const otherPoints = other.pointsByRound[i] ?? 0;
    if (winnerPoints !== otherPoints) {
      return { roundNumber: i + 1, winnerPoints, otherPoints };
    }
  }
  return null;
}

/** Explains only a tiebreak that decides first place. */
export function describeRankingTiebreak(
  snapshots: RankingCompetitorSnapshot[]
): string | null {
  const ahead = snapshots[0];
  const behind = snapshots[1];
  if (!ahead || !behind || ahead.totalPoints <= 0 ||
      ahead.totalPoints !== behind.totalPoints || rankingSnapshotsAreTied(ahead, behind)) {
    return null;
  }
  if (ahead.tableWinCount !== behind.tableWinCount) {
    return `${ahead.name} ficou à frente de ${behind.name} no desempate por vitórias em mesas (${ahead.tableWinCount} contra ${behind.tableWinCount}).`;
  }
  const round = findDecisiveRoundDifference(ahead, behind);
  if (round) {
    const priority = Array.from(
      { length: Math.max(ahead.pointsByRound.length, behind.pointsByRound.length) },
      (_, index) => `R${index + 1}`
    ).reverse().join(' > ');
    return `${ahead.name} ficou à frente de ${behind.name} no desempate pela rodada ${round.roundNumber} (${round.winnerPoints} contra ${round.otherPoints} pontos). As rodadas mais recentes têm prioridade: ${priority}.`;
  }
  return null;
}

export function doublesTeamStatsAreTied(
  a: DoublesTeamStats,
  b: DoublesTeamStats
): boolean {
  if (a.totalPoints !== b.totalPoints) {
    return false;
  }
  if (a.tableWinCount !== b.tableWinCount) {
    return false;
  }
  const maxRound = Math.max(a.pointsByRound.length, b.pointsByRound.length);
  for (let i = 0; i < maxRound; i++) {
    if ((a.pointsByRound[i] ?? 0) !== (b.pointsByRound[i] ?? 0)) {
      return false;
    }
  }
  return true;
}

export function compareDoublesTeamStats(
  a: DoublesTeamStats,
  b: DoublesTeamStats
): number {
  if (b.totalPoints !== a.totalPoints) {
    return b.totalPoints - a.totalPoints;
  }
  if (b.tableWinCount !== a.tableWinCount) {
    return b.tableWinCount - a.tableWinCount;
  }
  const maxRound = Math.max(a.pointsByRound.length, b.pointsByRound.length);
  for (let i = maxRound - 1; i >= 0; i--) {
    const pa = a.pointsByRound[i] ?? 0;
    const pb = b.pointsByRound[i] ?? 0;
    if (pb !== pa) {
      return pb - pa;
    }
  }
  return a.label.localeCompare(b.label, 'pt-BR');
}

export function calculatePlayerStats(tournament: Tournament): PlayerStats[] {
  const maxRound =
    tournament.rounds.length > 0
      ? Math.max(...tournament.rounds.map((r) => r.number))
      : 0;

  const tableWins = countTableWinsByPlayerId(tournament);
  const statsMap: Record<string, PlayerStats> = {};

  tournament.players.forEach((player) => {
    statsMap[player.id] = {
      playerId: player.id,
      playerName: player.name,
      pointsByRound: Array.from({ length: maxRound }, () => 0),
      totalPoints: 0,
      tableWinCount: tableWins.get(player.id) ?? 0,
    };
  });

  for (const round of tournament.rounds) {
    const ri = round.number - 1;
    if (ri < 0 || ri >= maxRound) {
      continue;
    }
    for (const table of round.tables) {
      if (!table.results || table.results.length !== table.players.length) {
        continue;
      }
      for (const r of table.results) {
        const stats = statsMap[r.playerId];
        if (stats) {
          stats.pointsByRound[ri] += r.points;
          stats.totalPoints += r.points;
        }
      }
    }
  }

  const statsArray = Object.values(statsMap);
  statsArray.sort(comparePlayerStats);
  return statsArray;
}

export function calculateDoublesTeamStats(
  tournament: Tournament
): DoublesTeamStats[] {
  const playerStats = calculatePlayerStats(tournament);
  const byId = new Map(playerStats.map((s) => [s.playerId, s]));
  const teams = getDoublesTeamsFromPlayers(tournament.players);
  const maxRound =
    tournament.rounds.length > 0
      ? Math.max(...tournament.rounds.map((r) => r.number))
      : 0;

  const rows: DoublesTeamStats[] = teams.map((team) => {
    const sa = byId.get(team.a.id);
    const sb = byId.get(team.b.id);
    const pointsByRound = Array.from({ length: maxRound }, (_, ri) => {
      const pa = sa?.pointsByRound[ri] ?? 0;
      const pb = sb?.pointsByRound[ri] ?? 0;
      if (pa === pb) {
        return pa;
      }
      return Math.round((pa + pb) / 2);
    });
    let totalPoints = 0;
    if (sa && sb) {
      totalPoints =
        sa.totalPoints === sb.totalPoints
          ? sa.totalPoints
          : Math.round((sa.totalPoints + sb.totalPoints) / 2);
    }
    const tableWinCount = Math.max(
      sa?.tableWinCount ?? 0,
      sb?.tableWinCount ?? 0
    );
    return {
      teamKey: pairKey(team.a.id, team.b.id),
      label: `${team.a.name} & ${team.b.name}`,
      pointsByRound,
      totalPoints,
      tableWinCount,
    };
  });

  rows.sort(compareDoublesTeamStats);
  return rows;
}

export interface RankedGroup<T> {
  rank: number;
  rows: T[];
}

export function groupByCompetitionRank<T extends { totalPoints: number }>(
  stats: T[]
): RankedGroup<T>[] {
  if (stats.length === 0) {
    return [];
  }

  const groups: RankedGroup<T>[] = [];
  let currentRank = 1;

  for (let i = 0; i < stats.length; i++) {
    if (i > 0 && stats[i].totalPoints !== stats[i - 1].totalPoints) {
      currentRank = i + 1;
    }
    const last = groups[groups.length - 1];
    if (last && last.rank === currentRank) {
      last.rows.push(stats[i]);
    } else {
      groups.push({ rank: currentRank, rows: [stats[i]] });
    }
  }

  return groups;
}

const RANKING_COPY_SEPARATOR = '━━━━━━━━━━━━━━━━';
const PODIUM_MEDALS = ['🥇', '🥈', '🥉'] as const;

function formatRankedListMessage(
  title: string,
  ranked: Array<{ name: string; totalPoints: number }>
): string {
  if (ranked.length === 0) {
    return `🏆 RANKING — ${title}\n\nNenhum resultado registrado ainda.`;
  }

  const lines: string[] = [`🏆 RANKING — ${title}`, ''];

  const podiumCount = Math.min(3, ranked.length);
  for (let i = 0; i < podiumCount; i++) {
    const row = ranked[i];
    lines.push(`${PODIUM_MEDALS[i]} ${i + 1}º Lugar`);
    lines.push(`${row.name} — ${row.totalPoints} pts`);
    lines.push('');
  }

  if (ranked.length > 3) {
    lines.push(RANKING_COPY_SEPARATOR);
    for (let i = 3; i < ranked.length; i++) {
      const row = ranked[i];
      lines.push(`${i + 1}° ${row.name} — ${row.totalPoints} pts`);
    }
  }

  return lines.join('\n').trimEnd();
}

export function formatTournamentRankingMessage(tournament: Tournament): string {
  const title = tournament.name.toUpperCase();

  if (normalizeTournamentModality(tournament.modality) === 'doubles_cmd') {
    const ranked = calculateDoublesTeamStats(tournament)
      .filter((s) => s.totalPoints > 0)
      .map((s) => ({ name: s.label, totalPoints: s.totalPoints }));
    return formatRankedListMessage(title, ranked);
  }

  const ranked = calculatePlayerStats(tournament)
    .filter((s) => s.totalPoints > 0)
    .map((s) => ({ name: s.playerName, totalPoints: s.totalPoints }));
  return formatRankedListMessage(title, ranked);
}
