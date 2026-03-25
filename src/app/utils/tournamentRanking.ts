import type {
  DoublesTeamStats,
  Tournament,
  PlayerStats,
} from '../types/tournament';
import { getDoublesTeamsFromPlayers } from './doublesRoundGenerator';
import { pairKey } from './roundGenerator';

export function calculatePlayerStats(tournament: Tournament): PlayerStats[] {
  const maxRound =
    tournament.rounds.length > 0
      ? Math.max(...tournament.rounds.map((r) => r.number))
      : 0;

  const statsMap: Record<string, PlayerStats> = {};

  tournament.players.forEach((player) => {
    statsMap[player.id] = {
      playerId: player.id,
      playerName: player.name,
      pointsByRound: Array.from({ length: maxRound }, () => 0),
      totalPoints: 0,
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
  statsArray.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    for (let i = maxRound - 1; i >= 0; i--) {
      if (b.pointsByRound[i] !== a.pointsByRound[i]) {
        return b.pointsByRound[i] - a.pointsByRound[i];
      }
    }
    return a.playerName.localeCompare(b.playerName, 'pt-BR');
  });

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
    return {
      teamKey: pairKey(team.a.id, team.b.id),
      label: `${team.a.name} & ${team.b.name}`,
      pointsByRound,
      totalPoints,
    };
  });

  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    for (let i = maxRound - 1; i >= 0; i--) {
      if (b.pointsByRound[i] !== a.pointsByRound[i]) {
        return b.pointsByRound[i] - a.pointsByRound[i];
      }
    }
    return a.label.localeCompare(b.label, 'pt-BR');
  });

  return rows;
}
