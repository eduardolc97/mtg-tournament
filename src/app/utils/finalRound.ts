import type { Round, Tournament } from '../types/tournament';
import { expectedSwissRoundsForTournament } from './tournamentSwiss';
import { buildSinglesStandingsRound, buildDoublesStandingsRound } from './standingsPairing';

export function aggregatePointsThroughRound(
  tournament: Tournament,
  upToRoundInclusive: number
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of tournament.players) {
    map.set(p.id, 0);
  }
  for (const round of tournament.rounds) {
    if (round.number > upToRoundInclusive) {
      break;
    }
    for (const table of round.tables) {
      if (!table.results || table.results.length !== table.players.length) {
        continue;
      }
      for (const r of table.results) {
        map.set(r.playerId, (map.get(r.playerId) ?? 0) + r.points);
      }
    }
  }
  return map;
}

export function buildDoublesLastSwissRound(tournament: Tournament, swissCount: number): Round {
  if (swissCount < 2) {
    throw new Error('CMD em duplas: são necessárias pelo menos 2 rodadas.');
  }
  return buildDoublesStandingsRound(tournament, swissCount, true);
}

export function buildFinalRoundForTournament(tournament: Tournament): Round {
  return buildRoundThree(tournament);
}

export function buildRoundThree(tournament: Tournament): Round {
  const swiss = expectedSwissRoundsForTournament(tournament);
  return buildSinglesStandingsRound(tournament, swiss + 1, true);
}

export function isRoundFullyScored(round: Round | undefined): boolean {
  if (!round || round.tables.length === 0) {
    return false;
  }
  return round.tables.every(
    (t) => t.results && t.results.length === t.players.length
  );
}
