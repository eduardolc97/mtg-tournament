import type { Tournament } from '../types/tournament';
import {
  expectedSwissRoundCount,
  normalizeTournamentModality,
} from '../constants/tournamentModality';

export function expectedSwissRoundsForTournament(t: Tournament): number {
  return expectedSwissRoundCount(
    normalizeTournamentModality(t.modality),
    t.players.length,
    t.doublesIncludeFourthSwissRound
  );
}

export function plannedRoundsForTournament(t: Tournament): number {
  const modality = normalizeTournamentModality(t.modality);
  const swiss = expectedSwissRoundsForTournament(t);
  if (modality === 'doubles_cmd') {
    return swiss;
  }
  return swiss + 1;
}
