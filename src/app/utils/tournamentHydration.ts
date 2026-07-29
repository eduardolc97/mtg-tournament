import type { Player, Round, Tournament } from '../types/tournament';
import { normalizePauperRecord } from './pauperScoring';

type ParticipantRow = {
  id: string;
  player_id: string;
  partner_id: string | null;
  wins?: number | null;
  losses?: number | null;
  draws?: number | null;
  performance_pct?: number | string | null;
  players: {
    id: string;
    nickname: string;
    full_name: string | null;
    companion_nick: string | null;
  } | null;
};

function parsePerformancePct(raw: unknown): number | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.min(100, Math.max(0, n));
}

function participantToPlayer(row: ParticipantRow): Player | null {
  if (!row.players) {
    return null;
  }
  const pauperRecord = normalizePauperRecord({
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    draws: row.draws ?? 0,
    performancePct: parsePerformancePct(row.performance_pct),
  });
  return {
    id: row.id,
    playerId: row.player_id,
    name: row.players.nickname,
    fullName: row.players.full_name,
    companionNick: row.players.companion_nick,
    partnerId: row.partner_id ?? undefined,
    pauperRecord,
  };
}

export function buildPlayersFromParticipants(
  participants: ParticipantRow[]
): Player[] {
  return participants
    .map(participantToPlayer)
    .filter((p): p is Player => p !== null);
}

export function hydrateRoundsWithPlayers(
  rounds: Round[],
  players: Player[]
): Round[] {
  const byEntryId = new Map(players.map((p) => [p.id, p]));

  return rounds.map((round) => ({
    ...round,
    tables: round.tables.map((table) => ({
      ...table,
      players: table.players.map((stored) => {
        const full = byEntryId.get(stored.id);
        if (full) {
          return { ...full };
        }
        const legacyName =
          'name' in stored && typeof stored.name === 'string'
            ? stored.name
            : 'Jogador';
        return {
          id: stored.id,
          playerId: stored.id,
          name: legacyName,
        };
      }),
    })),
  }));
}

export function hydrateTournament(
  base: Omit<Tournament, 'players' | 'rounds'> & {
    rounds: Round[];
  },
  participants: ParticipantRow[]
): Tournament {
  const players = buildPlayersFromParticipants(participants);
  const rounds = hydrateRoundsWithPlayers(base.rounds, players);
  return {
    ...base,
    players,
    rounds,
  };
}

export type { ParticipantRow };
