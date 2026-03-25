export type TournamentModality =
  | 'weekly_cmd100'
  | 'doubles_cmd'
  | 'cmd_open_table';

export const DEFAULT_TOURNAMENT_MODALITY: TournamentModality = 'weekly_cmd100';

export const TOURNAMENT_MODALITIES: readonly TournamentModality[] = [
  'weekly_cmd100',
  'doubles_cmd',
  'cmd_open_table',
] as const;

export function normalizeTournamentModality(
  raw: unknown
): TournamentModality {
  if (raw === 'doubles_cmd' || raw === 'cmd_open_table') {
    return raw;
  }
  return DEFAULT_TOURNAMENT_MODALITY;
}

export function countsTowardMonthlyLeague(
  modality: TournamentModality
): boolean {
  return modality === 'weekly_cmd100';
}

export function expectedSwissRoundCount(
  modality: TournamentModality,
  playerCount: number,
  doublesIncludeFourthSwissRound?: boolean | null
): number {
  if (modality === 'doubles_cmd') {
    const duplas = playerCount / 2;
    if (duplas < 8) {
      return 2;
    }
    return doublesIncludeFourthSwissRound === true ? 4 : 3;
  }
  return 2;
}

export function plannedTotalRounds(
  modality: TournamentModality,
  playerCount: number,
  doublesIncludeFourthSwissRound?: boolean | null
): number {
  const swiss = expectedSwissRoundCount(
    modality,
    playerCount,
    doublesIncludeFourthSwissRound
  );
  if (modality === 'doubles_cmd') {
    return swiss;
  }
  return swiss + 1;
}

export function tournamentModalityLabelPt(
  modality: TournamentModality
): string {
  switch (modality) {
    case 'weekly_cmd100':
      return 'Liga CMD 100 semanal';
    case 'doubles_cmd':
      return 'CMD em duplas';
    case 'cmd_open_table':
      return 'CMD mesão livre';
    default:
      return 'Liga CMD 100 semanal';
  }
}
