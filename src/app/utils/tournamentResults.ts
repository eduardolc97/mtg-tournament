import { normalizeTournamentModality } from '../constants/tournamentModality';
import type { TableResult, Tournament } from '../types/tournament';
import { expectedSwissRoundsForTournament } from './tournamentSwiss';
import {
  buildDoublesLastSwissRound,
  buildFinalRoundForTournament,
  isRoundFullyScored,
} from './finalRound';

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

  let rounds = nextRounds;
  let next: Tournament = { ...tournament, rounds };

  const modality = normalizeTournamentModality(next.modality);
  const swissCount = expectedSwissRoundsForTournament(next);

  if (modality === 'doubles_cmd' && swissCount >= 2) {
    const hasLast = rounds.some((round) => round.number === swissCount);
    const preliminary = rounds.filter((round) => round.number < swissCount);
    const preliminaryComplete =
      preliminary.length === swissCount - 1 &&
      preliminary.every((round) => isRoundFullyScored(round));
    if (!hasLast && preliminaryComplete) {
      const lastSwiss = buildDoublesLastSwissRound(
        { ...next, rounds },
        swissCount
      );
      rounds = [...rounds, lastSwiss];
      next = { ...next, rounds };
    }
  }

  if (modality !== 'doubles_cmd') {
    const finalRoundNumber = swissCount + 1;
    const hasFinal = rounds.some(
      (round) => round.number === finalRoundNumber
    );
    const swissRounds = rounds.filter((round) => round.number <= swissCount);
    const allSwissComplete =
      swissRounds.length === swissCount &&
      swissRounds.every((round) => isRoundFullyScored(round));
    if (!hasFinal && allSwissComplete) {
      next = {
        ...next,
        rounds: [...rounds, buildFinalRoundForTournament({ ...next, rounds })],
      };
    }
  }

  return next;
}
