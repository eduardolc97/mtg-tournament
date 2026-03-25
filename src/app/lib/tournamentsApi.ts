import type { Tournament } from '../types/tournament';
import { normalizeTournamentModality } from '../constants/tournamentModality';
import { supabase } from './supabaseClient';

type TournamentWire = Omit<
  Tournament,
  | 'createdAt'
  | 'leagueYear'
  | 'leagueMonth'
  | 'modality'
  | 'doublesIncludeFourthSwissRound'
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
  players: unknown;
  rounds: unknown;
  league_year: number;
  league_month: number;
  modality: string;
  doubles_include_fourth_swiss_round: boolean | null;
};

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

export function parseTournament(raw: TournamentWire): Tournament {
  const createdAt = new Date(raw.createdAt);
  let doublesFourth: boolean | null = null;
  if (raw.doublesIncludeFourthSwissRound === true) {
    doublesFourth = true;
  } else if (raw.doublesIncludeFourthSwissRound === false) {
    doublesFourth = false;
  }
  return {
    ...raw,
    createdAt,
    leagueYear: coerceLeagueInt(raw.leagueYear, createdAt.getFullYear()),
    leagueMonth: coerceLeagueInt(raw.leagueMonth, createdAt.getMonth() + 1),
    modality: normalizeTournamentModality(raw.modality),
    doublesIncludeFourthSwissRound: doublesFourth,
  };
}

function serializeTournament(t: Tournament): TournamentWire {
  return {
    ...t,
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
    players: row.players as TournamentWire['players'],
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

function assertCreatePayload(w: TournamentWire): void {
  const mod =
    w.modality !== undefined && w.modality !== null && w.modality !== ''
      ? w.modality
      : 'weekly_cmd100';
  if (
    typeof w.id !== 'string' ||
    typeof w.name !== 'string' ||
    !Array.isArray(w.players) ||
    !Array.isArray(w.rounds) ||
    typeof w.createdAt !== 'string' ||
    !isValidLeagueYear(w.leagueYear) ||
    !isValidLeagueMonth(w.leagueMonth) ||
    !isValidModality(mod)
  ) {
    throw new Error('Invalid tournament');
  }
}

function assertUpdatePayload(w: TournamentWire): void {
  if (
    typeof w.name !== 'string' ||
    !Array.isArray(w.players) ||
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
    players: w.players,
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
    players: w.players,
    rounds: w.rounds,
    league_year: w.leagueYear!,
    league_month: w.leagueMonth!,
    modality: normalizeTournamentModality(w.modality),
    doubles_include_fourth_swiss_round: normalizeDoublesFourth(
      w.doublesIncludeFourthSwissRound,
    ),
  };
}

export async function fetchPresetPlayerNames(): Promise<string[]> {
  const { data, error } = await supabase
    .from('preset_player_names')
    .select('name')
    .order('name', { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map((r) => r.name)
    .filter((x): x is string => typeof x === 'string');
}

export async function fetchTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  if (!Array.isArray(data)) {
    return [];
  }
  return (data as TournamentRow[]).map((row) =>
    parseTournament(rowToWire(row)),
  );
}

export async function postTournament(t: Tournament): Promise<Tournament> {
  const w = serializeTournament(t);
  assertCreatePayload(w);
  const row = wireToInsertRow(w);
  const { data, error } = await supabase
    .from('tournaments')
    .insert(row)
    .select('*')
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return parseTournament(rowToWire(data as TournamentRow));
}

export async function putTournament(t: Tournament): Promise<Tournament> {
  const w = serializeTournament(t);
  assertUpdatePayload(w);
  const updateRow = wireToUpdateRow(w);
  const { data, error } = await supabase
    .from('tournaments')
    .update(updateRow)
    .eq('id', t.id)
    .select('*')
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return parseTournament(rowToWire(data as TournamentRow));
}
