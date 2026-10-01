import { normalizeTournamentModality } from '../constants/tournamentModality';
import type { TableResult, Tournament } from '../types/tournament';
import { plannedRoundsForTournament } from './tournamentSwiss';
import { buildSinglesStandingsRound, buildDoublesStandingsRound } from './standingsPairing';
import { isRoundFullyScored } from './finalRound';

/**
 * Applies a table result and creates the next round when the existing
 * tournament rules say it is ready. This is a pure tournament transition;
 * persistence and React state updates stay with their callers.
 */
export function applyTableResults(
  tournament: Tournament,
  roundId: string,
  tableId: string,
  results: TableResult[]
): Tournament {
  const nextRounds = tournament.rounds.map((round) => {
    if (round.id !== roundId) {
      return round;
    }
    return {
      ...round,
      tables: round.tables.map((table) => {
        if (table.id !== tableId) {
          return table;
        }
        return {
          ...table,
          results,
        };
      }),
    };
  });

  const next: Tournament = { ...tournament, rounds: nextRounds };
  const modality = normalizeTournamentModality(next.modality);
  if (modality === 'weekly_pauper') return next;

  const planned = plannedRoundsForTournament(next);
  const latest = Math.max(0, ...nextRounds.map(round => round.number));
  // Editing an older round only changes that result. Never rebuild existing tables.
  if (latest === 0 || latest >= planned || !Array.from({ length: latest }, (_, i) => i + 1)
    .every(number => isRoundFullyScored(nextRounds.find(round => round.number === number)))) {
    return next;
  }
  const number = latest + 1;
  const final = number === planned;
  const round = modality === 'doubles_cmd'
    ? buildDoublesStandingsRound(next, number, final)
    : buildSinglesStandingsRound(next, number, final);
  return { ...next, rounds: [...nextRounds, round] };
}
