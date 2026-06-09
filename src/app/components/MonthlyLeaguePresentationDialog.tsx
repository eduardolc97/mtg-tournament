import { useMemo } from 'react';
import { Crown, Trophy } from 'lucide-react';
import type { MonthlyLeagueRow } from '../utils/monthlyLeague';
import { monthlyLeagueRowsAreTied } from '../utils/monthlyLeague';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

interface MonthlyLeaguePresentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodLabel: string;
  eventCount: number;
  rows: MonthlyLeagueRow[];
}

type DisplayRow = MonthlyLeagueRow & { position: number };

function toRankedRows(rows: MonthlyLeagueRow[]): DisplayRow[] {
  return rows.map((row, index) => ({
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
  return (
    <div className="rounded-xl border border-yellow-500/55 bg-gradient-to-r from-yellow-950/50 to-yellow-900/20 px-[clamp(0.75rem,1.5vmin,1.25rem)] py-[clamp(0.5rem,1vmin,0.875rem)]">
      <div className="flex flex-wrap items-center gap-x-[clamp(0.5rem,1.5vmin,1rem)] gap-y-1">
        <Crown className="h-[clamp(1.25rem,0.85rem+1.5vmin,1.75rem)] w-[clamp(1.25rem,0.85rem+1.5vmin,1.75rem)] shrink-0 text-yellow-400" />
        <span className="min-w-0 flex-1 font-bold leading-snug text-yellow-100 text-[clamp(1rem,0.65rem+1.5vmin,1.5rem)]">
          {row.displayName}
        </span>
        <div className="flex shrink-0 flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5">
          <span className="font-bold tabular-nums text-yellow-400 text-[clamp(1.75rem,1.1rem+2.5vmin,2.75rem)] leading-none">
            {row.totalPointsInMonth}
          </span>
          <span className="font-medium text-yellow-500/80 text-[clamp(0.75rem,0.5rem+0.8vmin,0.9375rem)]">
            pts
          </span>
          <span className="text-yellow-500/70 text-[clamp(0.6875rem,0.42rem+0.7vmin,0.8125rem)] tabular-nums">
            {row.firstPlaceCount} vit. diária
            {row.firstPlaceCount !== 1 ? 's' : ''}
            {' · '}
            {row.tableFirstPlaceCount} mesa
            {row.tableFirstPlaceCount !== 1 ? 's' : ''} 5 pts
          </span>
        </div>
      </div>
    </div>
  );
}

interface RankingTableProps {
  rows: DisplayRow[];
}

function RankingTable({ rows }: RankingTableProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-700 hover:bg-transparent">
          <TableHead className="h-auto px-1 py-1 text-slate-300 w-10 min-w-[2rem] text-[clamp(0.625rem,0.38rem+0.7vmin,0.75rem)]">
            Pos.
          </TableHead>
          <TableHead className="h-auto px-1 py-1 text-slate-300 min-w-0 text-[clamp(0.625rem,0.38rem+0.7vmin,0.75rem)]">
            Jogador
          </TableHead>
          <TableHead className="h-auto px-1 py-1 text-slate-300 text-center w-12 text-[clamp(0.625rem,0.38rem+0.7vmin,0.75rem)]">
            Tot.
          </TableHead>
          <TableHead className="h-auto px-1 py-1 text-slate-300 text-center w-10 text-[clamp(0.625rem,0.38rem+0.7vmin,0.75rem)]">
            Vit.D
          </TableHead>
          <TableHead className="h-auto px-1 py-1 text-slate-300 text-center w-10 text-[clamp(0.625rem,0.38rem+0.7vmin,0.75rem)]">
            5pts
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
              {row.displayName}
            </TableCell>
            <TableCell className="px-1 py-[clamp(0.15rem,0.35vmin,0.35rem)] text-center">
              <span className="inline-block min-w-[2rem] rounded-md bg-purple-950/60 px-1.5 py-0.5 font-bold tabular-nums text-purple-300 text-[clamp(0.875rem,0.55rem+1vmin,1.125rem)]">
                {row.totalPointsInMonth}
              </span>
            </TableCell>
            <TableCell className="px-1 py-[clamp(0.15rem,0.35vmin,0.35rem)] text-center tabular-nums text-slate-300 text-[clamp(0.6875rem,0.42rem+0.75vmin,0.8125rem)]">
              {row.firstPlaceCount}
            </TableCell>
            <TableCell className="px-1 py-[clamp(0.15rem,0.35vmin,0.35rem)] text-center tabular-nums text-slate-300 text-[clamp(0.6875rem,0.42rem+0.75vmin,0.8125rem)]">
              {row.tableFirstPlaceCount}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function MonthlyLeaguePresentationDialog({
  open,
  onOpenChange,
  periodLabel,
  eventCount,
  rows,
}: MonthlyLeaguePresentationDialogProps) {
  const rankedRows = useMemo(() => toRankedRows(rows), [rows]);

  const leader = rankedRows[0];

  const winners = useMemo(() => {
    if (!leader || leader.totalPointsInMonth <= 0) {
      return [];
    }
    return rankedRows.filter((r) => monthlyLeagueRowsAreTied(r, leader));
  }, [rankedRows, leader]);

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
            <Trophy className="h-[1.1em] w-[1.1em] shrink-0 text-yellow-400" />
            Liga mensal
          </DialogTitle>
          <p className="line-clamp-1 capitalize text-slate-400 text-[clamp(0.75rem,0.5rem+0.8vmin,0.9375rem)]">
            {periodLabel}
          </p>
          <p className="text-slate-500 text-[clamp(0.6875rem,0.42rem+0.65vmin,0.8125rem)]">
            {eventCount} campeonato{eventCount !== 1 ? 's' : ''} · desempate:
            vitórias diárias, depois mesas com 5 pts
          </p>
          <DialogDescription className="sr-only">
            Classificação da liga mensal de {periodLabel} para leitura em grupo.
          </DialogDescription>
        </DialogHeader>

        {winners.length > 0 && (
          <div className="flex shrink-0 flex-col gap-[clamp(0.35rem,0.6vmin,0.65rem)]">
            {winners.map((row) => (
              <WinnerBox key={row.key} row={row} />
            ))}
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-[clamp(0.5rem,1.5vmin,1.25rem)] overflow-hidden pt-[clamp(0.35rem,0.6vmin,0.65rem)]">
          <div className="min-w-0 overflow-hidden">
            <RankingTable rows={leftRows} />
          </div>
          <div className="min-w-0 overflow-hidden">
            <RankingTable rows={rightRows} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
