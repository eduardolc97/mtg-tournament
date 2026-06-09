import { normalizeTournamentModality } from '../constants/tournamentModality';
import type { Player, Round, Table, Tournament } from '../types/tournament';
import { buildRoundThree, isRoundFullyScored } from './finalRound';
import {
  buildFlexibleTablesForRound,
  generateFlexibleSwissRoundsOneAndTwo,
} from './roundGenerator';
import { expectedSwissRoundsForTournament } from './tournamentSwiss';

export function createEntryId(): string {
  return `entry-${Date.now()}-${Math.random()}`;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
    return { ok: true };
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

export function canGenerateTournamentRounds(
  tournament: Tournament
): { ok: boolean; reason?: string } {
  if (!isSinglesModality(tournament)) {
    return {
      ok: false,
      reason: 'Geração manual de rodadas não disponível nesta modalidade.',
    };
  }

  if (tournament.rounds.length > 0) {
    return { ok: false, reason: 'As rodadas já foram geradas.' };
  }

  if (tournament.players.length < 3) {
    return {
      ok: false,
      reason: 'Adicione pelo menos 3 jogadores antes de gerar as rodadas.',
    };
  }

  return { ok: true };
}

export const canAddPlayerToTournament = canModifyTournamentRoster;

function splitFinalAndRegular(tables: Table[]): {
  finalTables: Table[];
  regularTables: Table[];
} {
  const finalTables = tables.filter((t) => t.isFinalTable);
  const regularTables = tables.filter((t) => !t.isFinalTable);
  return { finalTables, regularTables };
}

function renumberRoundTables(
  finalTables: Table[],
  regularTables: Table[],
  roundNumber: number
): Table[] {
  const finals = finalTables.map((t, i) => ({
    ...t,
    id: `round-${roundNumber}-table-${i + 1}`,
  }));
  const startNum = finals.length + 1;
  const regular = regularTables.map((t, i) => ({
    ...t,
    id: `round-${roundNumber}-table-${startNum + i}`,
    results: undefined,
  }));
  return [...finals, ...regular];
}

function findLastTableIndexWithSize3(regularTables: Table[]): number {
  for (let i = regularTables.length - 1; i >= 0; i--) {
    if (regularTables[i].players.length === 3) {
      return i;
    }
  }
  return -1;
}

function tableSizeIsInvalid(playerCount: number): boolean {
  return playerCount > 4 || (playerCount > 0 && playerCount < 3);
}

function regularTablesHaveInvalidSizes(regularTables: Table[]): boolean {
  return regularTables.some((t) => tableSizeIsInvalid(t.players.length));
}

function indicesOfTablesWithFour(regularTables: Table[]): number[] {
  return regularTables
    .map((t, i) => (t.players.length === 4 ? i : -1))
    .filter((i) => i >= 0);
}

function redistributeFromFourPlayerTables(
  regularTables: Table[],
  newPlayer: Player
): Table[] | null {
  const fourIndices = indicesOfTablesWithFour(regularTables);
  if (fourIndices.length < 2) {
    return null;
  }

  const shuffledIndices = shuffleArray(fourIndices);
  const indexA = shuffledIndices[0];
  const indexB = shuffledIndices[1];

  const copy = regularTables.map((t) => ({
    ...t,
    players: [...t.players],
  }));

  const pickA = shuffleArray(copy[indexA].players)[0];
  copy[indexA].players = copy[indexA].players.filter((p) => p.id !== pickA.id);

  const pickB = shuffleArray(copy[indexB].players)[0];
  copy[indexB].players = copy[indexB].players.filter((p) => p.id !== pickB.id);

  copy.push({
    id: 'temp-new',
    players: [pickA, pickB, newPlayer],
    results: undefined,
  });

  return copy;
}

function addPlayerToRegularTables(
  regularTables: Table[],
  newPlayer: Player
): Table[] | null {
  const tableOf3Idx = findLastTableIndexWithSize3(regularTables);
  if (tableOf3Idx >= 0) {
    const copy = regularTables.map((t) => ({
      ...t,
      players: [...t.players],
    }));
    copy[tableOf3Idx].players.push(newPlayer);
    return copy;
  }

  return redistributeFromFourPlayerTables(regularTables, newPlayer);
}

function insertPlayerIntoSideTables(
  tables: Table[],
  newPlayer: Player,
  roundNumber: number,
  allPlayers: Player[],
  previousRounds: Round[]
): Table[] {
  const { finalTables, regularTables } = splitFinalAndRegular(tables);

  if (regularTables.length === 0) {
    throw new Error('Não há mesas laterais para adicionar o jogador.');
  }

  let updatedRegular: Table[];
  if (regularTablesHaveInvalidSizes(regularTables)) {
    updatedRegular = buildFlexibleTablesForRound(
      allPlayers,
      roundNumber,
      1,
      previousRounds
    );
  } else {
    const adjusted = addPlayerToRegularTables(regularTables, newPlayer);
    updatedRegular =
      adjusted ??
      buildFlexibleTablesForRound(
        allPlayers,
        roundNumber,
        1,
        previousRounds
      );
  }

  if (regularTablesHaveInvalidSizes(updatedRegular)) {
    updatedRegular = buildFlexibleTablesForRound(
      allPlayers,
      roundNumber,
      1,
      previousRounds
    );
  }

  return renumberRoundTables(finalTables, updatedRegular, roundNumber);
}

function roundNeedsFullRegen(tables: Table[]): boolean {
  return tables.some((t) => tableSizeIsInvalid(t.players.length));
}

function removePlayerFromTables(tables: Table[], entryId: string): Table[] {
  return tables
    .map((t) => ({
      ...t,
      players: t.players.filter((p) => p.id !== entryId),
      results: undefined,
    }))
    .filter((t) => t.players.length > 0);
}

function rebuildSwissRound(
  tournament: Tournament,
  updatedPlayers: Player[],
  roundNumber: number,
  roundsBefore: Round[]
): Round {
  const tables = buildFlexibleTablesForRound(
    updatedPlayers,
    roundNumber,
    1,
    roundsBefore
  );
  return {
    id: `round-${roundNumber}`,
    number: roundNumber,
    tables,
  };
}

function applyLateJoinRounds(
  tournament: Tournament,
  updatedPlayers: Player[],
  newEntry: Player
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
    } else if (i === currentIndex) {
      const tables = insertPlayerIntoSideTables(
        round.tables,
        newEntry,
        roundNumber,
        updatedPlayers,
        roundsBefore
      );
      newRounds[i] = { ...round, tables };
    } else {
      newRounds[i] = rebuildSwissRound(
        tournament,
        updatedPlayers,
        roundNumber,
        roundsBefore
      );
    }
  }

  return newRounds;
}

function applyRemovalRounds(
  tournament: Tournament,
  updatedPlayers: Player[],
  entryId: string
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
    const tablesAfterRemoval = removePlayerFromTables(round.tables, entryId);

    if (roundNeedsFullRegen(tablesAfterRemoval)) {
      if (isFinalRound) {
        newRounds[i] = buildRoundThree({
          ...tournament,
          players: updatedPlayers,
          rounds: roundsBefore,
        });
      } else {
        newRounds[i] = rebuildSwissRound(
          tournament,
          updatedPlayers,
          roundNumber,
          roundsBefore
        );
      }
    } else {
      const { finalTables, regularTables } = splitFinalAndRegular(
        tablesAfterRemoval
      );
      newRounds[i] = {
        ...round,
        tables: renumberRoundTables(finalTables, regularTables, roundNumber),
      };
    }
  }

  return newRounds;
}

export function generateInitialRoundsForTournament(
  tournament: Tournament
): Tournament {
  const guard = canGenerateTournamentRounds(tournament);
  if (!guard.ok) {
    throw new Error(guard.reason ?? 'Não é possível gerar rodadas.');
  }

  const rounds = generateFlexibleSwissRoundsOneAndTwo(tournament.players);
  return { ...tournament, rounds };
}

export function applyLateJoin(
  tournament: Tournament,
  newEntry: Player
): Tournament {
  const guard = canModifyTournamentRoster(tournament);
  if (!guard.ok) {
    throw new Error(guard.reason ?? 'Não é possível adicionar jogador.');
  }

  const updatedPlayers = [...tournament.players, newEntry];

  if (tournament.rounds.length === 0) {
    return { ...tournament, players: updatedPlayers };
  }

  return {
    ...tournament,
    players: updatedPlayers,
    rounds: applyLateJoinRounds(tournament, updatedPlayers, newEntry),
  };
}

export function applyRosterRemoval(
  tournament: Tournament,
  entryId: string
): Tournament {
  const guard = canModifyTournamentRoster(tournament);
  if (!guard.ok) {
    throw new Error(guard.reason ?? 'Não é possível remover jogador.');
  }

  const updatedPlayers = tournament.players.filter((p) => p.id !== entryId);
  if (updatedPlayers.length === tournament.players.length) {
    throw new Error('Jogador não encontrado no campeonato.');
  }
  if (updatedPlayers.length === 0) {
    throw new Error('O campeonato precisa de pelo menos um jogador.');
  }

  if (tournament.rounds.length === 0) {
    return { ...tournament, players: updatedPlayers };
  }

  return {
    ...tournament,
    players: updatedPlayers,
    rounds: applyRemovalRounds(tournament, updatedPlayers, entryId),
  };
}
