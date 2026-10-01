import { useMemo } from 'react';
import { Crown, Trophy, Users } from 'lucide-react';
import { normalizeTournamentModality } from '../../constants/tournamentModality';
import type { DoublesTeamStats, PlayerStats, Tournament } from '../../types/tournament';
import {
  calculateDoublesTeamStats,
  calculatePlayerStats,
  describeTopRankingTiebreak,
  doublesTeamStatsAreTied,
  doublesTeamStatsToSnapshot,
  playerStatsAreTied,
  playerStatsToSnapshot,
} from '../../utils/tournamentRanking';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface RankingPresentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: Tournament;
}

type DisplayRow = {
  key: string;
  label: string;
  totalPoints: number;
  tableWinCount: number;
  position: number;
};

function toRankedRows(
  doubles: boolean,
  stats: PlayerStats[],
  teamStats: DoublesTeamStats[]
): DisplayRow[] {
  const raw = doubles
    ? teamStats.map((row) => ({
        key: row.teamKey,
        label: row.label,
        totalPoints: row.totalPoints,
        tableWinCount: row.tableWinCount,
      }))
    : stats.map((row) => ({
        key: row.playerId,
        label: row.playerName,
        totalPoints: row.totalPoints,
        tableWinCount: row.tableWinCount,
      }));

  return raw.map((row, index) => ({
    ...row,
    position: index + 1,
  }));
}

function splitInHalf<T>(items: T[]): [T[], T[]] {
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)];
}

interface WinnerBoxProps {
  row: DisplayRow;
}

function WinnerBox({ row }: WinnerBoxProps) {
  const mesasLabel =
    row.tableWinCount === 1
      ? '1 mesa com 5 pontos'
      : `${row.tableWinCount} mesas com 5 pontos`;

  return (
    <div className="rounded-xl border border-yellow-500/55 bg-gradient-to-r from-yellow-950/50 to-yellow-900/20 px-[clamp(0.75rem,1.5vmin,1.25rem)] py-[clamp(0.5rem,1vmin,0.875rem)]">
      <div className="flex flex-wrap items-center gap-x-[clamp(0.5rem,1.5vmin,1rem)] gap-y-1">
        <Crown className="h-[clamp(1.25rem,0.85rem+1.5vmin,1.75rem)] w-[clamp(1.25rem,0.85rem+1.5vmin,1.75rem)] shrink-0 text-yellow-400" />
        <div className="min-w-0 flex-1">
          <span className="block font-bold leading-snug text-yellow-100 text-[clamp(1rem,0.65rem+1.5vmin,1.5rem)]">
            {row.label}
          </span>
          <span className="block text-yellow-500/75 text-[clamp(0.6875rem,0.42rem+0.7vmin,0.8125rem)]">
            {mesasLabel}
          </span>
        </div>
        <div className="flex shrink-0 items-baseline gap-1.5">
          <span className="font-bold tabular-nums text-yellow-400 text-[clamp(1.75rem,1.1rem+2.5vmin,2.75rem)] leading-none">
            {row.totalPoints}
          </span>
          <span className="font-medium text-yellow-500/80 text-[clamp(0.75rem,0.5rem+0.8vmin,0.9375rem)]">
            pontos
          </span>
        </div>
      </div>
    </div>
  );
}

interface TiebreakNoticeProps {
  message: string;
}

function TiebreakNotice({ message }: TiebreakNoticeProps) {
  return (
    <p className="rounded-lg border border-amber-500/35 bg-amber-950/25 px-[clamp(0.65rem,1.2vmin,1rem)] py-[clamp(0.45rem,0.8vmin,0.75rem)] text-center leading-snug text-amber-100/95 text-[clamp(0.75rem,0.48rem+0.85vmin,0.9375rem)]">
      {message}
    </p>
  );
}

interface RankingTableProps {
  rows: DisplayRow[];
  doubles: boolean;
}

function RankingTable({ rows, doubles }: RankingTableProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-700 hover:bg-transparent">
          <TableHead className="h-auto px-1 py-1 text-slate-300 w-10 min-w-[2rem] text-[clamp(0.625rem,0.38rem+0.7vmin,0.75rem)]">
            Posição
          </TableHead>
          <TableHead className="h-auto px-1 py-1 text-slate-300 min-w-0 text-[clamp(0.625rem,0.38rem+0.7vmin,0.75rem)]">
            {doubles ? 'Dupla' : 'Jogador'}
          </TableHead>
          <TableHead className="h-auto px-1 py-1 text-slate-300 text-center w-12 text-[clamp(0.625rem,0.38rem+0.7vmin,0.75rem)]">
            Total
          </TableHead>
          <TableHead className="h-auto px-1 py-1 text-slate-300 text-center min-w-[3.5rem] text-[clamp(0.625rem,0.38rem+0.7vmin,0.75rem)]">
            Mesas 5 pts
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.key}
            className="border-slate-700/80 hover:bg-slate-800/40"
          >
            <TableCell className="px-1 py-[clamp(0.15rem,0.35vmin,0.35rem)]">
              <div className="mx-auto flex h-[clamp(1.5rem,1.1rem+1vmin,1.75rem)] w-[clamp(1.5rem,1.1rem+1vmin,1.75rem)] items-center justify-center rounded-full bg-slate-700 text-[clamp(0.6875rem,0.42rem+0.75vmin,0.8125rem)] font-semibold text-white">
                {row.position}
              </div>
            </TableCell>
            <TableCell className="px-1 py-[clamp(0.15rem,0.35vmin,0.35rem)] text-white text-[clamp(0.6875rem,0.42rem+0.85vmin,0.875rem)]">
              {row.label}
            </TableCell>
            <TableCell className="px-1 py-[clamp(0.15rem,0.35vmin,0.35rem)] text-center">
              <span className="inline-block min-w-[2rem] rounded-md bg-purple-950/60 px-1.5 py-0.5 font-bold tabular-nums text-purple-300 text-[clamp(0.875rem,0.55rem+1vmin,1.125rem)]">
                {row.totalPoints}
              </span>
            </TableCell>
            <TableCell className="px-1 py-[clamp(0.15rem,0.35vmin,0.35rem)] text-center tabular-nums text-slate-300 text-[clamp(0.6875rem,0.42rem+0.75vmin,0.8125rem)]">
              {row.tableWinCount}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function RankingPresentationDialog({
  open,
  onOpenChange,
  tournament,
}: RankingPresentationDialogProps) {
  const doubles =
    normalizeTournamentModality(tournament.modality) === 'doubles_cmd';
  const stats = calculatePlayerStats(tournament);
  const teamStats = doubles ? calculateDoublesTeamStats(tournament) : [];

  const rankedRows = useMemo(
    () => toRankedRows(doubles, stats, teamStats),
    [doubles, stats, teamStats]
  );

  const tiebreakMessage = useMemo(() => {
    const snapshots = doubles
      ? teamStats.map(doublesTeamStatsToSnapshot)
      : stats.map(playerStatsToSnapshot);
    return describeTopRankingTiebreak(snapshots);
  }, [doubles, stats, teamStats]);

  const winners = useMemo(() => {
    if (doubles) {
      const leader = teamStats[0];
      if (!leader || leader.totalPoints <= 0) {
        return [];
      }
      return rankedRows.filter((r) => {
        const team = teamStats.find((t) => t.teamKey === r.key);
        return team !== undefined && doublesTeamStatsAreTied(team, leader);
      });
    }
    const leader = stats[0];
    if (!leader || leader.totalPoints <= 0) {
      return [];
    }
    return rankedRows.filter((r) => {
      const player = stats.find((s) => s.playerId === r.key);
      return player !== undefined && playerStatsAreTied(player, leader);
    });
  }, [doubles, rankedRows, stats, teamStats]);

  const winnerKeys = useMemo(
    () => new Set(winners.map((r) => r.key)),
    [winners]
  );

  const tableRows = useMemo(
    () => rankedRows.filter((r) => !winnerKeys.has(r.key)),
    [rankedRows, winnerKeys]
  );

  const [leftRows, rightRows] = useMemo(
    () => splitInHalf(tableRows),
    [tableRows]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!fixed !inset-0 !left-0 !top-0 !flex !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 flex-col overflow-hidden rounded-none border-slate-800 bg-slate-950 p-[clamp(0.5rem,0.3rem+1.25vmin,1.25rem)] pt-[clamp(2.5rem,1.5rem+3.5vmin,3.5rem)]"
        closeClassName="text-white opacity-95 hover:opacity-100 hover:bg-white/15 data-[state=open]:text-white [&_svg]:size-[clamp(1.125rem,0.75rem+1.25vmin,1.5rem)]"
      >
        <DialogHeader className="shrink-0 space-y-0 pb-[clamp(0.35rem,0.6vmin,0.65rem)] text-center">
          <DialogTitle className="flex items-center justify-center gap-2 leading-tight text-white text-[clamp(1rem,0.6rem+1.75vmin,1.75rem)]">
            {doubles ? (
              <Users className="h-[1.1em] w-[1.1em] shrink-0 text-yellow-400" />
            ) : (
              <Trophy className="h-[1.1em] w-[1.1em] shrink-0 text-yellow-400" />
            )}
            Classificação final
          </DialogTitle>
          <p className="line-clamp-1 text-slate-400 text-[clamp(0.75rem,0.5rem+0.8vmin,0.9375rem)]">
            {tournament.name}
          </p>
          <DialogDescription className="sr-only">
            Ranking final do torneio {tournament.name} para leitura em grupo.
          </DialogDescription>
        </DialogHeader>

        {winners.length > 0 && (
          <div className="flex shrink-0 flex-col gap-[clamp(0.35rem,0.6vmin,0.65rem)]">
            {winners.map((row) => (
              <WinnerBox key={row.key} row={row} />
            ))}
          </div>
        )}

        {tiebreakMessage && (
          <TiebreakNotice message={tiebreakMessage} />
        )}

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-[clamp(0.5rem,1.5vmin,1.25rem)] overflow-hidden pt-[clamp(0.35rem,0.6vmin,0.65rem)]">
          <div className="min-w-0 overflow-hidden">
            <RankingTable rows={leftRows} doubles={doubles} />
          </div>
          <div className="min-w-0 overflow-hidden">
            <RankingTable rows={rightRows} doubles={doubles} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
