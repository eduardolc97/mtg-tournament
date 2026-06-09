import type {
  DoublesTeamStats,
  Tournament,
  PlayerStats,
} from '../types/tournament';
import { getDoublesTeamsFromPlayers } from './doublesRoundGenerator';
import { pairKey } from './roundGenerator';
import { TABLE_FIRST_PLACE_POINTS } from './scoring';

function countFivePointTablesByPlayerId(
  tournament: Tournament
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const round of tournament.rounds) {
    for (const table of round.tables) {
      if (!table.results || table.results.length !== table.players.length) {
        continue;
      }
      for (const r of table.results) {
        if (r.points !== TABLE_FIRST_PLACE_POINTS) {
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
  if (b.fivePointTableCount !== a.fivePointTableCount) {
    return b.fivePointTableCount - a.fivePointTableCount;
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
  if (a.fivePointTableCount !== b.fivePointTableCount) {
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
  fivePointTableCount: number;
  pointsByRound: number[];
}

export function playerStatsToSnapshot(
  stats: PlayerStats
): RankingCompetitorSnapshot {
  return {
    name: stats.playerName,
    totalPoints: stats.totalPoints,
    fivePointTableCount: stats.fivePointTableCount,
    pointsByRound: stats.pointsByRound,
  };
}

export function doublesTeamStatsToSnapshot(
  stats: DoublesTeamStats
): RankingCompetitorSnapshot {
  return {
    name: stats.label,
    totalPoints: stats.totalPoints,
    fivePointTableCount: stats.fivePointTableCount,
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
  if (a.fivePointTableCount !== b.fivePointTableCount) {
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

function formatNameListPt(names: string[]): string {
  if (names.length === 0) {
    return '';
  }
  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    return `${names[0]} e ${names[1]}`;
  }
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

function mesasComCincoPontosLabel(count: number): string {
  if (count === 1) {
    return '1 mesa com 5 pontos';
  }
  return `${count} mesas com 5 pontos`;
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

export function describeTopRankingTiebreak(
  snapshots: RankingCompetitorSnapshot[]
): string | null {
  if (snapshots.length < 2 || snapshots[0].totalPoints <= 0) {
    return null;
  }

  const leader = snapshots[0];
  const tiedOnPoints = snapshots.filter(
    (row) => row.totalPoints === leader.totalPoints
  );
  if (tiedOnPoints.length < 2) {
    return null;
  }

  const coChampions = tiedOnPoints.filter((row) =>
    rankingSnapshotsAreTied(row, leader)
  );

  if (coChampions.length >= 2) {
    const names = formatNameListPt(coChampions.map((row) => row.name));
    const pointsWord = leader.totalPoints === 1 ? 'ponto' : 'pontos';
    const mesasWord =
      leader.fivePointTableCount === 1
        ? mesasComCincoPontosLabel(1)
        : mesasComCincoPontosLabel(leader.fivePointTableCount);
    return `${names} empataram no campeonato com ${leader.totalPoints} ${pointsWord} no total, ${mesasWord} cada e o mesmo resultado em todas as rodadas.`;
  }

  const runnerUp = tiedOnPoints.find(
    (row) => !rankingSnapshotsAreTied(row, leader)
  );
  if (!runnerUp) {
    return null;
  }

  const pointsWord = leader.totalPoints === 1 ? 'ponto' : 'pontos';

  if (leader.fivePointTableCount !== runnerUp.fivePointTableCount) {
    const diff = leader.fivePointTableCount - runnerUp.fivePointTableCount;
    const mesaWord = diff === 1 ? 'mesa' : 'mesas';
    return `${leader.name} ficou em 1º no desempate contra ${runnerUp.name}: ambos terminaram com ${leader.totalPoints} ${pointsWord}, mas ${leader.name} venceu ${diff} ${mesaWord} com 5 pontos a mais (${mesasComCincoPontosLabel(leader.fivePointTableCount)} contra ${mesasComCincoPontosLabel(runnerUp.fivePointTableCount)}).`;
  }

  const roundDiff = findDecisiveRoundDifference(leader, runnerUp);
  if (roundDiff) {
    const pointDiff = roundDiff.winnerPoints - roundDiff.otherPoints;
    const pointWord = pointDiff === 1 ? 'ponto' : 'pontos';
    return `${leader.name} ficou em 1º no desempate contra ${runnerUp.name}: ambos terminaram com ${leader.totalPoints} ${pointsWord} e ${mesasComCincoPontosLabel(leader.fivePointTableCount)}, mas ${leader.name} fez ${pointDiff} ${pointWord} a mais na rodada ${roundDiff.roundNumber} (${roundDiff.winnerPoints} contra ${roundDiff.otherPoints}).`;
  }

  return `${leader.name} ficou em 1º no desempate contra ${runnerUp.name} com ${leader.totalPoints} ${pointsWord} no total.`;
}

export function doublesTeamStatsAreTied(
  a: DoublesTeamStats,
  b: DoublesTeamStats
): boolean {
  if (a.totalPoints !== b.totalPoints) {
    return false;
  }
  if (a.fivePointTableCount !== b.fivePointTableCount) {
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
  if (b.fivePointTableCount !== a.fivePointTableCount) {
    return b.fivePointTableCount - a.fivePointTableCount;
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

  const fivePointTables = countFivePointTablesByPlayerId(tournament);
  const statsMap: Record<string, PlayerStats> = {};

  tournament.players.forEach((player) => {
    statsMap[player.id] = {
      playerId: player.id,
      playerName: player.name,
      pointsByRound: Array.from({ length: maxRound }, () => 0),
      totalPoints: 0,
      fivePointTableCount: fivePointTables.get(player.id) ?? 0,
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
    const fivePointTableCount = Math.max(
      sa?.fivePointTableCount ?? 0,
      sb?.fivePointTableCount ?? 0
    );
    return {
      teamKey: pairKey(team.a.id, team.b.id),
      label: `${team.a.name} & ${team.b.name}`,
      pointsByRound,
      totalPoints,
      fivePointTableCount,
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
