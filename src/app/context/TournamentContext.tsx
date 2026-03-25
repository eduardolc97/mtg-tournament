import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { Tournament, TableResult } from '../types/tournament';
import { normalizeTournamentModality } from '../constants/tournamentModality';
import { expectedSwissRoundsForTournament } from '../utils/tournamentSwiss';
import {
  buildDoublesLastSwissRound,
  buildFinalRoundForTournament,
  isRoundFullyScored,
} from '../utils/finalRound';
import {
  fetchTournaments,
  postTournament,
  putTournament,
} from '../lib/tournamentsApi';

interface TournamentContextType {
  tournaments: Tournament[];
  loading: boolean;
  addTournament: (tournament: Tournament) => Promise<void>;
  updateTournament: (id: string, tournament: Tournament) => Promise<void>;
  getTournamentById: (id: string) => Tournament | undefined;
  updateTableResults: (
    tournamentId: string,
    roundId: string,
    tableId: string,
    results: TableResult[]
  ) => Promise<void>;
}

const TournamentContext = createContext<TournamentContextType | undefined>(
  undefined
);

export const useTournaments = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournaments must be used within TournamentProvider');
  }
  return context;
};

function withUpdatedTableResults(
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
    const hasLast = rounds.some((r) => r.number === swissCount);
    const preliminary = rounds.filter((r) => r.number < swissCount);
    const preliminaryComplete =
      preliminary.length === swissCount - 1 &&
      preliminary.every((r) => isRoundFullyScored(r));
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
    const hasFinal = rounds.some((r) => r.number === finalRoundNumber);
    const swissRounds = rounds.filter((r) => r.number <= swissCount);
    const allSwissComplete =
      swissRounds.length === swissCount &&
      swissRounds.every((r) => isRoundFullyScored(r));
    if (!hasFinal && allSwissComplete) {
      next = {
        ...next,
        rounds: [...rounds, buildFinalRoundForTournament({ ...next, rounds })],
      };
    }
  }
  return next;
}

export const TournamentProvider = ({ children }: { children: ReactNode }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchTournaments();
        if (!cancelled) {
          setTournaments(list);
        }
      } catch {
        if (!cancelled) {
          setTournaments([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addTournament = async (tournament: Tournament) => {
    const saved = await postTournament(tournament);
    setTournaments((prev) => [...prev, saved]);
  };

  const updateTournament = async (id: string, tournament: Tournament) => {
    const saved = await putTournament(tournament);
    setTournaments((prev) =>
      prev.map((t) => (t.id === id ? saved : t))
    );
  };

  const getTournamentById = (id: string) => {
    return tournaments.find((t) => t.id === id);
  };

  const updateTableResults = async (
    tournamentId: string,
    roundId: string,
    tableId: string,
    results: TableResult[]
  ) => {
    const current = tournaments.find((t) => t.id === tournamentId);
    if (!current) {
      throw new Error('Tournament not found');
    }
    const next = withUpdatedTableResults(
      current,
      roundId,
      tableId,
      results
    );
    const saved = await putTournament(next);
    setTournaments((prev) =>
      prev.map((t) => (t.id === tournamentId ? saved : t))
    );
  };

  return (
    <TournamentContext.Provider
      value={{
        tournaments,
        loading,
        addTournament,
        updateTournament,
        getTournamentById,
        updateTableResults,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
};
