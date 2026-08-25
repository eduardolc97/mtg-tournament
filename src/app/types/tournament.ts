import type { TournamentModality } from '../constants/tournamentModality';
import type { PauperRecord } from '../utils/pauperScoring';

export interface Player {
  id: string;
  playerId: string;
  name: string;
  fullName?: string | null;
  companionNick?: string | null;
  partnerId?: string;
  pauperRecord?: PauperRecord;
}

export type TableOutcome =
  | { type: 'place'; place: 1 | 2 | 3 | 4 }
  | { type: 'tie' };

export interface TableResult {
  playerId: string;
  outcome: TableOutcome;
  points: number;
}

export interface Table {
  id: string;
  players: Player[];
  results?: TableResult[];
  isFinalTable?: boolean;
  isLeadersTable?: boolean;
}

export interface Round {
  id: string;
  number: number;
  tables: Table[];
}

export interface Tournament {
  id: string;
  name: string;
  players: Player[];
  rounds: Round[];
  createdAt: Date;
  leagueYear: number;
  leagueMonth: number;
  modality: TournamentModality;
  doublesIncludeFourthSwissRound?: boolean | null;
  openTableIncludeFourthRound?: boolean | null;
  pointsDoubled?: boolean;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  pointsByRound: number[];
  totalPoints: number;
  fivePointTableCount: number;
}

export interface DoublesTeamStats {
  teamKey: string;
  label: string;
  pointsByRound: number[];
  totalPoints: number;
  fivePointTableCount: number;
}

