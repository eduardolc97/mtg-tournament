import type { Player, Tournament } from '../types/tournament';
import { normalizeTournamentModality } from '../constants/tournamentModality';
import { applyLateJoin, applyRosterRemoval } from '../utils/lateJoinPlayer';
import { stripRoundsForStorage } from '../utils/roundPersistence';
import { hydrateTournament } from '../utils/tournamentHydration';
import { supabase } from './supabaseClient';

type TournamentWire = Omit<
  Tournament,
  | 'createdAt'
  | 'leagueYear'
  | 'leagueMonth'
  | 'modality'
  | 'doublesIncludeFourthSwissRound'
  | 'players'
> & {
  createdAt: string;
  leagueYear?: number;
  leagueMonth?: number;
  modality?: string;
  doublesIncludeFourthSwissRound?: boolean | null;
};

type TournamentRow = {
  id: string;
  name: string;
  created_at: string;
  rounds: unknown;
  league_year: number;
  league_month: number;
  modality: string;
  doubles_include_fourth_swiss_round: boolean | null;
};

type ParticipantJoinRow = {
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

type TournamentRowWithParticipants = TournamentRow & {
  tournament_participants: ParticipantJoinRow[];
};

const TOURNAMENT_SELECT = `
  *,
  tournament_participants (
    id,
    player_id,
    partner_id,
    players (
      id,
      nickname,
      full_name,
      companion_nick
    )
  )
`;

function coerceLeagueInt(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseInt(v, 10);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return fallback;
}

export function parseTournament(
  raw: TournamentWire,
  participants: ParticipantJoinRow[] = []
): Tournament {
  const createdAt = new Date(raw.createdAt);
  let doublesFourth: boolean | null = null;
  if (raw.doublesIncludeFourthSwissRound === true) {
    doublesFourth = true;
  } else if (raw.doublesIncludeFourthSwissRound === false) {
    doublesFourth = false;
  }

  const base = {
    id: raw.id,
    name: raw.name,
    rounds: raw.rounds,
    createdAt,
    leagueYear: coerceLeagueInt(raw.leagueYear, createdAt.getFullYear()),
    leagueMonth: coerceLeagueInt(raw.leagueMonth, createdAt.getMonth() + 1),
    modality: normalizeTournamentModality(raw.modality),
    doublesIncludeFourthSwissRound: doublesFourth,
  };

  return hydrateTournament(base, participants);
}

function serializeTournament(t: Tournament): TournamentWire {
  return {
    id: t.id,
    name: t.name,
    rounds: stripRoundsForStorage(t.rounds),
    createdAt: t.createdAt.toISOString(),
    leagueYear: t.leagueYear,
    leagueMonth: t.leagueMonth,
    modality: t.modality,
    doublesIncludeFourthSwissRound:
      t.doublesIncludeFourthSwissRound === true ||
      t.doublesIncludeFourthSwissRound === false
        ? t.doublesIncludeFourthSwissRound
        : null,
  };
}

function rowToWire(row: TournamentRow): TournamentWire {
  return {
    id: row.id,
    name: row.name,
    rounds: row.rounds as TournamentWire['rounds'],
    createdAt: row.created_at,
    leagueYear: row.league_year,
    leagueMonth: row.league_month,
    modality: row.modality,
    doublesIncludeFourthSwissRound: row.doubles_include_fourth_swiss_round,
  };
}

function isValidLeagueMonth(m: unknown): m is number {
  return (
    typeof m === 'number' && Number.isInteger(m) && m >= 1 && m <= 12
  );
}

function isValidLeagueYear(y: unknown): y is number {
  return typeof y === 'number' && Number.isInteger(y) && y >= 2000 && y <= 2100;
}

function isValidModality(m: unknown): m is string {
  return (
    m === 'weekly_cmd100' ||
    m === 'doubles_cmd' ||
    m === 'cmd_open_table'
  );
}

function normalizeDoublesFourth(v: unknown): boolean | null {
  if (v === true) {
    return true;
  }
  if (v === false) {
    return false;
  }
  return null;
}

function assertCreatePayload(w: TournamentWire, playerCount: number): void {
  const mod =
    w.modality !== undefined && w.modality !== null && w.modality !== ''
      ? w.modality
      : 'weekly_cmd100';
  if (
    typeof w.id !== 'string' ||
    typeof w.name !== 'string' ||
    !Array.isArray(w.rounds) ||
    typeof w.createdAt !== 'string' ||
    !isValidLeagueYear(w.leagueYear) ||
    !isValidLeagueMonth(w.leagueMonth) ||
    !isValidModality(mod) ||
    playerCount < 1
  ) {
    throw new Error('Invalid tournament');
  }
}

function assertUpdatePayload(w: TournamentWire): void {
  if (
    typeof w.name !== 'string' ||
    !Array.isArray(w.rounds) ||
    typeof w.createdAt !== 'string' ||
    !isValidLeagueYear(w.leagueYear) ||
    !isValidLeagueMonth(w.leagueMonth) ||
    !isValidModality(w.modality)
  ) {
    throw new Error('Invalid tournament');
  }
}

function wireToInsertRow(w: TournamentWire): TournamentRow {
  const mod =
    w.modality !== undefined && w.modality !== null && w.modality !== ''
      ? normalizeTournamentModality(w.modality)
      : 'weekly_cmd100';
  return {
    id: w.id,
    name: w.name,
    created_at: w.createdAt,
    rounds: w.rounds,
    league_year: w.leagueYear!,
    league_month: w.leagueMonth!,
    modality: mod,
    doubles_include_fourth_swiss_round: normalizeDoublesFourth(
      w.doublesIncludeFourthSwissRound,
    ),
  };
}

function wireToUpdateRow(w: TournamentWire): Omit<TournamentRow, 'id'> {
  return {
    name: w.name,
    created_at: w.createdAt,
    rounds: w.rounds,
    league_year: w.leagueYear!,
    league_month: w.leagueMonth!,
    modality: normalizeTournamentModality(w.modality),
    doubles_include_fourth_swiss_round: normalizeDoublesFourth(
      w.doublesIncludeFourthSwissRound,
    ),
  };
}

function parseRowWithParticipants(
  row: TournamentRowWithParticipants
): Tournament {
  const participants = Array.isArray(row.tournament_participants)
    ? row.tournament_participants
    : [];
  return parseTournament(rowToWire(row), participants);
}

async function insertParticipants(
  tournamentId: string,
  players: Tournament['players']
): Promise<void> {
  const rows = players.map((p) => ({
    id: p.id,
    tournament_id: tournamentId,
    player_id: p.playerId,
    partner_id: p.partnerId ?? null,
  }));

  const { error } = await supabase.from('tournament_participants').insert(rows);
  if (error) {
    throw new Error(error.message);
  }
}

export async function insertSingleParticipant(
  tournamentId: string,
  entry: Player
): Promise<void> {
  const { error } = await supabase.from('tournament_participants').insert({
    id: entry.id,
    tournament_id: tournamentId,
    player_id: entry.playerId,
    partner_id: entry.partnerId ?? null,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteSingleParticipant(
  tournamentId: string,
  entryId: string
): Promise<void> {
  const { error } = await supabase
    .from('tournament_participants')
    .delete()
    .eq('id', entryId)
    .eq('tournament_id', tournamentId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function addPlayerToTournament(
  tournament: Tournament,
  newEntry: Player
): Promise<Tournament> {
  const updated = applyLateJoin(tournament, newEntry);
  await insertSingleParticipant(tournament.id, newEntry);
  return putTournament(updated);
}

export async function removePlayerFromTournament(
  tournament: Tournament,
  entryId: string
): Promise<Tournament> {
  const updated = applyRosterRemoval(tournament, entryId);
  await deleteSingleParticipant(tournament.id, entryId);
  return putTournament(updated);
}

export async function fetchTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select(TOURNAMENT_SELECT)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  if (!Array.isArray(data)) {
    return [];
  }
  return (data as TournamentRowWithParticipants[]).map(parseRowWithParticipants);
}

export async function postTournament(t: Tournament): Promise<Tournament> {
  const w = serializeTournament(t);
  assertCreatePayload(w, t.players.length);
  const row = wireToInsertRow(w);

  const { data, error } = await supabase
    .from('tournaments')
    .insert(row)
    .select(TOURNAMENT_SELECT)
    .single();
  if (error) {
    throw new Error(error.message);
  }

  await insertParticipants(t.id, t.players);

  const { data: refreshed, error: refreshError } = await supabase
    .from('tournaments')
    .select(TOURNAMENT_SELECT)
    .eq('id', t.id)
    .single();
  if (refreshError) {
    return parseRowWithParticipants(data as TournamentRowWithParticipants);
  }
  return parseRowWithParticipants(refreshed as TournamentRowWithParticipants);
}

export async function putTournament(t: Tournament): Promise<Tournament> {
  const w = serializeTournament(t);
  assertUpdatePayload(w);
  const updateRow = wireToUpdateRow(w);
  const { data, error } = await supabase
    .from('tournaments')
    .update(updateRow)
    .eq('id', t.id)
    .select(TOURNAMENT_SELECT)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return parseRowWithParticipants(data as TournamentRowWithParticipants);
}
