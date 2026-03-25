import type { Tournament } from '../types/tournament';
import { normalizeTournamentModality } from '../constants/tournamentModality';

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

function coerceLeagueInt(
  v: unknown,
  fallback: number
): number {
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
    leagueYear: coerceLeagueInt(
      raw.leagueYear,
      createdAt.getFullYear()
    ),
    leagueMonth: coerceLeagueInt(
      raw.leagueMonth,
      createdAt.getMonth() + 1
    ),
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

export async function fetchPresetPlayerNames(): Promise<string[]> {
  const res = await fetch('/api/preset-player-names');
  if (!res.ok) {
    throw new Error('Failed to load preset player names');
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter((x): x is string => typeof x === 'string');
}

export async function fetchTournaments(): Promise<Tournament[]> {
  const res = await fetch('/api/tournaments');
  if (!res.ok) {
    throw new Error('Failed to load tournaments');
  }
  const data: TournamentWire[] = await res.json();
  return data.map(parseTournament);
}

export async function postTournament(t: Tournament): Promise<Tournament> {
  const res = await fetch('/api/tournaments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serializeTournament(t)),
  });
  if (!res.ok) {
    throw new Error('Failed to create tournament');
  }
  const raw: TournamentWire = await res.json();
  return parseTournament(raw);
}

export async function putTournament(t: Tournament): Promise<Tournament> {
  const res = await fetch(`/api/tournaments/${encodeURIComponent(t.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serializeTournament(t)),
  });
  if (!res.ok) {
    throw new Error('Failed to update tournament');
  }
  const raw: TournamentWire = await res.json();
  return parseTournament(raw);
}
