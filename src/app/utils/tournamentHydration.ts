import type { Player, Round, Tournament } from '../types/tournament';

type ParticipantRow = {
  id: string;
  player_id: string;
  partner_id: string | null;
  players: {
    id: string;
    nickname: string;
    full_name: string | null;
    companion_nick: string | null;
  } | null;
};

function participantToPlayer(row: ParticipantRow): Player | null {
  if (!row.players) {
    return null;
  }
  return {
    id: row.id,
    playerId: row.player_id,
    name: row.players.nickname,
    fullName: row.players.full_name,
    companionNick: row.players.companion_nick,
    partnerId: row.partner_id ?? undefined,
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
