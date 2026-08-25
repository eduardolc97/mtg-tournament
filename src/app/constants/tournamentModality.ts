export type TournamentModality =
  | 'weekly_cmd100'
  | 'doubles_cmd'
  | 'cmd_open_table'
  | 'weekly_pauper';

export const DEFAULT_TOURNAMENT_MODALITY: TournamentModality = 'weekly_cmd100';

export const TOURNAMENT_MODALITIES: readonly TournamentModality[] = [
  'weekly_cmd100',
  'doubles_cmd',
  'cmd_open_table',
  'weekly_pauper',
] as const;

export function normalizeTournamentModality(
  raw: unknown
): TournamentModality {
  if (
    raw === 'doubles_cmd' ||
    raw === 'cmd_open_table' ||
    raw === 'weekly_pauper'
  ) {
    return raw;
  }
  return DEFAULT_TOURNAMENT_MODALITY;
}

export function isPauperModality(modality: TournamentModality): boolean {
  return modality === 'weekly_pauper';
}

export function countsTowardMonthlyLeague(
  modality: TournamentModality
): boolean {
  return modality === 'weekly_cmd100';
}

export function countsTowardPauperLeague(
  modality: TournamentModality
): boolean {
  return modality === 'weekly_pauper';
}

export function expectedSwissRoundCount(
  modality: TournamentModality,
  playerCount: number,
  doublesIncludeFourthSwissRound?: boolean | null,
  openTableIncludeFourthRound?: boolean | null
): number {
  if (modality === 'weekly_pauper') {
    return 0;
  }
  if (modality === 'doubles_cmd') {
    const duplas = playerCount / 2;
    if (duplas < 8) {
      return 2;
    }
    return doublesIncludeFourthSwissRound === true ? 4 : 3;
  }
  if (modality === 'cmd_open_table') {
    return openTableIncludeFourthRound === true ? 3 : 2;
  }
  return 2;
}

export function plannedTotalRounds(
  modality: TournamentModality,
  playerCount: number,
  doublesIncludeFourthSwissRound?: boolean | null,
  openTableIncludeFourthRound?: boolean | null
): number {
  if (modality === 'weekly_pauper') {
    return 0;
  }
  const swiss = expectedSwissRoundCount(
    modality,
    playerCount,
    doublesIncludeFourthSwissRound,
    openTableIncludeFourthRound
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
    case 'weekly_pauper':
      return 'Liga Pauper semanal';
    default:
      return 'Liga CMD 100 semanal';
  }
}
