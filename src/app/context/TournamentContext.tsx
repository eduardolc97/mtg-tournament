import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { Player, Tournament, TableResult } from '../types/tournament';
import type { PlayerProfile } from '../types/player';
import { normalizeTournamentModality, isPauperModality } from '../constants/tournamentModality';
import { createEntryId } from '../utils/lateJoinPlayer';
import { applyTableResults } from '../utils/tournamentResults';
import {
  DEFAULT_PAUPER_RECORD,
  normalizePauperRecord,
  type PauperRecord,
} from '../utils/pauperScoring';
import {
  addPlayerToTournament as addPlayerToTournamentApi,
  fetchTournaments,
  generateTournamentRounds as generateTournamentRoundsApi,
  postTournament,
  putTournament,
  regenerateTournamentRounds as regenerateTournamentRoundsApi,
  removePlayerFromTournament as removePlayerFromTournamentApi,
  setTournamentPointsDoubled,
  updatePauperRecordAndRefresh,
  updateAllPauperRecordsAndRefresh,
} from '../lib/tournamentsApi';

interface TournamentContextType {
  tournaments: Tournament[];
  loading: boolean;
  addTournament: (tournament: Tournament) => Promise<void>;
  updateTournament: (id: string, tournament: Tournament) => Promise<void>;
  addPlayerToTournament: (
    tournamentId: string,
    profile: PlayerProfile,
    pauperRecord?: PauperRecord
  ) => Promise<void>;
  removePlayerFromTournament: (
    tournamentId: string,
    entryId: string
  ) => Promise<void>;
  generateTournamentRounds: (tournamentId: string) => Promise<void>;
  regenerateTournamentRounds: (tournamentId: string) => Promise<void>;
  getTournamentById: (id: string) => Tournament | undefined;
  updateTableResults: (
    tournamentId: string,
    roundId: string,
    tableId: string,
    results: TableResult[]
  ) => Promise<void>;
  updatePauperRecord: (
    tournamentId: string,
    entryId: string,
    record: PauperRecord
  ) => Promise<void>;
  updateAllPauperRecords: (
    tournamentId: string,
    updates: Array<{ entryId: string; record: PauperRecord }>
  ) => Promise<void>;
  togglePointsDoubled: (
    tournamentId: string,
    pointsDoubled: boolean
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

export const TournamentProvider = ({ children }: { children: ReactNode }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const tournamentsRef = useRef(tournaments);
  tournamentsRef.current = tournaments;

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
    const current = tournamentsRef.current.find((t) => t.id === tournamentId);
    if (!current) {
      throw new Error('Tournament not found');
    }
    const next = applyTableResults(
      current,
      roundId,
      tableId,
      results
    );
    setTournaments((prev) =>
      prev.map((t) => (t.id === tournamentId ? next : t))
    );
    const saved = await putTournament(next);
    setTournaments((prev) =>
      prev.map((t) => (t.id === tournamentId ? saved : t))
    );
  };

  const addPlayerToTournament = async (
    tournamentId: string,
    profile: PlayerProfile,
    pauperRecord?: PauperRecord
  ) => {
    const current = tournaments.find((t) => t.id === tournamentId);
    if (!current) {
      throw new Error('Tournament not found');
    }
    if (current.players.some((p) => p.playerId === profile.id)) {
      throw new Error('Jogador já adicionado');
    }
    const isPauper = isPauperModality(
      normalizeTournamentModality(current.modality)
    );
    const entry: Player = {
      id: createEntryId(),
      playerId: profile.id,
      name: profile.nickname,
      fullName: profile.fullName,
      companionNick: profile.companionNick,
      pauperRecord: isPauper
        ? normalizePauperRecord(pauperRecord ?? DEFAULT_PAUPER_RECORD)
        : undefined,
    };
    const saved = await addPlayerToTournamentApi(current, entry);
    setTournaments((prev) =>
      prev.map((t) => (t.id === tournamentId ? saved : t))
    );
  };

  const removePlayerFromTournament = async (
    tournamentId: string,
    entryId: string
  ) => {
    const current = tournaments.find((t) => t.id === tournamentId);
    if (!current) {
      throw new Error('Tournament not found');
    }
    const saved = await removePlayerFromTournamentApi(current, entryId);
    setTournaments((prev) =>
      prev.map((t) => (t.id === tournamentId ? saved : t))
    );
  };

  const generateTournamentRounds = async (tournamentId: string) => {
    const current = tournaments.find((t) => t.id === tournamentId);
    if (!current) {
      throw new Error('Tournament not found');
    }
    const saved = await generateTournamentRoundsApi(current);
    setTournaments((prev) =>
      prev.map((t) => (t.id === tournamentId ? saved : t))
    );
  };

  const regenerateTournamentRounds = async (tournamentId: string) => {
    const current = tournaments.find((t) => t.id === tournamentId);
    if (!current) {
      throw new Error('Tournament not found');
    }
    const saved = await regenerateTournamentRoundsApi(current);
    setTournaments((prev) =>
      prev.map((t) => (t.id === tournamentId ? saved : t))
    );
  };

  const updatePauperRecord = async (
    tournamentId: string,
    entryId: string,
    record: PauperRecord
  ) => {
    const current = tournaments.find((t) => t.id === tournamentId);
    if (!current) {
      throw new Error('Tournament not found');
    }
    const normalized = normalizePauperRecord(record);
    const saved = await updatePauperRecordAndRefresh(
      current,
      entryId,
      normalized
    );
    setTournaments((prev) =>
      prev.map((t) => (t.id === tournamentId ? saved : t))
    );
  };

  const updateAllPauperRecords = async (
    tournamentId: string,
    updates: Array<{ entryId: string; record: PauperRecord }>
  ) => {
    const current = tournaments.find((t) => t.id === tournamentId);
    if (!current) {
      throw new Error('Tournament not found');
    }
    const normalized = updates.map(({ entryId, record }) => ({
      entryId,
      record: normalizePauperRecord(record),
    }));
    const saved = await updateAllPauperRecordsAndRefresh(current, normalized);
    setTournaments((prev) =>
      prev.map((t) => (t.id === tournamentId ? saved : t))
    );
  };

  const togglePointsDoubled = async (
    tournamentId: string,
    pointsDoubled: boolean
  ) => {
    const current = tournaments.find((t) => t.id === tournamentId);
    if (!current) {
      throw new Error('Tournament not found');
    }
    const saved = await setTournamentPointsDoubled(current, pointsDoubled);
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
        addPlayerToTournament,
        removePlayerFromTournament,
        generateTournamentRounds,
        regenerateTournamentRounds,
        getTournamentById,
        updateTableResults,
        updatePauperRecord,
        updateAllPauperRecords,
        togglePointsDoubled,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
};
