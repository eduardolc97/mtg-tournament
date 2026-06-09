import { normalizeTournamentModality } from '../constants/tournamentModality';
import type { Player, Round, Tournament } from '../types/tournament';
import { buildRoundThree, isRoundFullyScored } from './finalRound';
import { buildFlexibleTablesForRound } from './roundGenerator';
import { expectedSwissRoundsForTournament } from './tournamentSwiss';

export function createEntryId(): string {
  return `entry-${Date.now()}-${Math.random()}`;
}

function isSinglesModality(tournament: Tournament): boolean {
  const mod = normalizeTournamentModality(tournament.modality);
  return mod === 'weekly_cmd100' || mod === 'cmd_open_table';
}

function findCurrentRoundIndex(rounds: Round[]): number {
  return rounds.findIndex((r) => !isRoundFullyScored(r));
}

function roundHasAnyResults(round: Round): boolean {
  return round.tables.some((t) => t.results && t.results.length > 0);
}

export function canModifyTournamentRoster(
  tournament: Tournament
): { ok: boolean; reason?: string } {
  if (!isSinglesModality(tournament)) {
    return {
      ok: false,
      reason: 'Alteração de jogadores não disponível nesta modalidade.',
    };
  }

  if (tournament.rounds.length === 0) {
    return { ok: false, reason: 'O campeonato ainda não possui rodadas geradas.' };
  }

  const allComplete = tournament.rounds.every((r) => isRoundFullyScored(r));
  if (allComplete) {
    return { ok: false, reason: 'O campeonato já foi encerrado.' };
  }

  const currentIndex = findCurrentRoundIndex(tournament.rounds);
  if (currentIndex < 0) {
    return { ok: false, reason: 'Não foi possível identificar a rodada atual.' };
  }

  const currentRound = tournament.rounds[currentIndex];
  if (roundHasAnyResults(currentRound)) {
    return {
      ok: false,
      reason:
        'Só é possível adicionar ou remover jogadores entre rodadas, antes de qualquer mesa ser pontuada.',
    };
  }

  return { ok: true };
}

export const canAddPlayerToTournament = canModifyTournamentRoster;

function reallocateUnplayedRounds(
  tournament: Tournament,
  updatedPlayers: Player[]
): Round[] {
  const swissCount = expectedSwissRoundsForTournament({
    ...tournament,
    players: updatedPlayers,
  });
  const currentIndex = findCurrentRoundIndex(tournament.rounds);
  const newRounds = tournament.rounds.map((r) => ({
    ...r,
    tables: r.tables.map((t) => ({
      ...t,
      players: [...t.players],
    })),
  }));

  for (let i = currentIndex; i < newRounds.length; i++) {
    const round = newRounds[i];
    if (isRoundFullyScored(round)) {
      continue;
    }

    const roundNumber = round.number;
    const isFinalRound = roundNumber > swissCount;
    const roundsBefore = newRounds.slice(0, i);

    if (isFinalRound) {
      newRounds[i] = buildRoundThree({
        ...tournament,
        players: updatedPlayers,
        rounds: roundsBefore,
      });
    } else {
      const tables = buildFlexibleTablesForRound(
        updatedPlayers,
        roundNumber,
        1,
        roundsBefore
      );
      newRounds[i] = { ...round, tables };
    }
  }

  return newRounds;
}

function applyRosterChange(
  tournament: Tournament,
  updatedPlayers: Player[]
): Tournament {
  const guard = canModifyTournamentRoster(tournament);
  if (!guard.ok) {
    throw new Error(guard.reason ?? 'Não é possível alterar o elenco.');
  }

  return {
    ...tournament,
    players: updatedPlayers,
    rounds: reallocateUnplayedRounds(tournament, updatedPlayers),
  };
}

export function applyLateJoin(
  tournament: Tournament,
  newEntry: Player
): Tournament {
  return applyRosterChange(tournament, [...tournament.players, newEntry]);
}

export function applyRosterRemoval(
  tournament: Tournament,
  entryId: string
): Tournament {
  const updatedPlayers = tournament.players.filter((p) => p.id !== entryId);
  if (updatedPlayers.length === tournament.players.length) {
    throw new Error('Jogador não encontrado no campeonato.');
  }
  if (updatedPlayers.length === 0) {
    throw new Error('O campeonato precisa de pelo menos um jogador.');
  }
  return applyRosterChange(tournament, updatedPlayers);
}
