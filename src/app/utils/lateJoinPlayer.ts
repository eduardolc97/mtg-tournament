import { normalizeTournamentModality } from '../constants/tournamentModality';
import type { Player, Round, Table, Tournament } from '../types/tournament';
import { buildRoundThree, isRoundFullyScored } from './finalRound';
import {
  buildFlexibleTablesForRound,
  buildTablesForRound,
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
  const idx = rounds.findIndex((r) => !isRoundFullyScored(r));
  return idx;
}

function roundHasAnyResults(round: Round): boolean {
  return round.tables.some((t) => t.results && t.results.length > 0);
}

export function canAddPlayerToTournament(
  tournament: Tournament
): { ok: boolean; reason?: string } {
  if (!isSinglesModality(tournament)) {
    return { ok: false, reason: 'Adição de jogadores não disponível nesta modalidade.' };
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
        'Só é possível adicionar entre rodadas, antes de qualquer mesa ser pontuada.',
    };
  }

  return { ok: true };
}

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

function hasTableOf3(regularTables: Table[]): boolean {
  return regularTables.some((t) => t.players.length === 3);
}

function appendToLastRegularTable(
  regularTables: Table[],
  newPlayer: Player
): Table[] {
  const copy = regularTables.map((t) => ({
    ...t,
    players: [...t.players],
  }));
  copy[copy.length - 1].players.push(newPlayer);
  return copy;
}

function redistributeSingleAllFourTable(
  table: Table,
  newPlayer: Player
): Table[] {
  const shuffled = shuffleArray([...table.players]);
  const picked = shuffled.slice(0, 2);
  const remaining = shuffled.slice(2);
  return [
    { id: 'temp', players: remaining, results: undefined },
    { id: 'temp-last', players: [...picked, newPlayer], results: undefined },
  ];
}

function redistributeLastTwoAllFourTables(
  regularTables: Table[],
  newPlayer: Player,
  roundNumber: number,
  previousRounds: Round[]
): Table[] {
  const prefix = regularTables.slice(0, -2).map((t) => ({
    ...t,
    players: [...t.players],
  }));
  const lastTwo = regularTables.slice(-2);
  const pool: Player[] = lastTwo.flatMap((t) => t.players);

  const shuffled = shuffleArray(pool);
  const picked = shuffled.slice(0, 2);
  const remaining = shuffled.slice(2);
  const newLastTable: Table = {
    id: 'temp-last',
    players: [...picked, newPlayer],
  };

  const middleTables = buildFlexibleTablesForRound(
    remaining,
    roundNumber,
    1,
    previousRounds
  );

  return [
    ...prefix,
    ...middleTables.map((t) => ({
      ...t,
      results: undefined as undefined,
    })),
    { ...newLastTable, results: undefined },
  ];
}

function redistributeAllFourRegularTables(
  regularTables: Table[],
  newPlayer: Player,
  roundNumber: number,
  previousRounds: Round[]
): Table[] {
  if (regularTables.length === 1) {
    return redistributeSingleAllFourTable(regularTables[0], newPlayer);
  }
  return redistributeLastTwoAllFourTables(
    regularTables,
    newPlayer,
    roundNumber,
    previousRounds
  );
}

export function insertPlayerIntoSideTables(
  tables: Table[],
  newPlayer: Player,
  previousRounds: Round[],
  roundNumber: number
): Table[] {
  const { finalTables, regularTables } = splitFinalAndRegular(tables);

  if (regularTables.length === 0) {
    throw new Error('Não há mesas laterais para adicionar o jogador.');
  }

  let updatedRegular: Table[];
  if (hasTableOf3(regularTables)) {
    updatedRegular = appendToLastRegularTable(regularTables, newPlayer);
  } else {
    updatedRegular = redistributeAllFourRegularTables(
      regularTables,
      newPlayer,
      roundNumber,
      previousRounds
    );
  }

  return renumberRoundTables(finalTables, updatedRegular, roundNumber);
}

export function applyLateJoin(
  tournament: Tournament,
  newEntry: Player
): Tournament {
  const guard = canAddPlayerToTournament(tournament);
  if (!guard.ok) {
    throw new Error(guard.reason ?? 'Não é possível adicionar jogador.');
  }

  const updatedPlayers = [...tournament.players, newEntry];
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
      const rebuilt = buildRoundThree({
        ...tournament,
        players: updatedPlayers,
        rounds: roundsBefore,
      });
      newRounds[i] = rebuilt;
    } else if (i === currentIndex) {
      const tables = insertPlayerIntoSideTables(
        round.tables,
        newEntry,
        roundsBefore,
        roundNumber
      );
      newRounds[i] = { ...round, tables };
    } else {
      const sideTables = buildFlexibleTablesForRound(
        updatedPlayers,
        roundNumber,
        1,
        roundsBefore
      );
      newRounds[i] = { ...round, tables: sideTables };
    }
  }

  return {
    ...tournament,
    players: updatedPlayers,
    rounds: newRounds,
  };
}
