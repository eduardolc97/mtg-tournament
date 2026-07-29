import { useMemo } from 'react';
import { Crown, Trophy } from 'lucide-react';
import type { PauperLeagueRow } from '../utils/pauperLeague';
import { pauperLeagueRowsAreTied } from '../utils/pauperLeague';
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

interface PauperLeaguePresentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodLabel: string;
  eventCount: number;
  rows: PauperLeagueRow[];
}

type DisplayRow = PauperLeagueRow & { position: number };

function toRankedRows(rows: PauperLeagueRow[]): DisplayRow[] {
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
        </div>
      </div>
    </div>
  );
}

export default function PauperLeaguePresentationDialog({
  open,
  onOpenChange,
  periodLabel,
  eventCount,
  rows,
}: PauperLeaguePresentationDialogProps) {
  const ranked = useMemo(() => toRankedRows(rows), [rows]);
  const winners = useMemo(() => {
    if (ranked.length === 0 || ranked[0].totalPointsInMonth <= 0) {
      return [];
    }
    const leader = ranked[0];
    return ranked.filter((r) => pauperLeagueRowsAreTied(r, leader));
  }, [ranked]);

  const rest = useMemo(() => {
    if (winners.length === 0) {
      return ranked;
    }
    return ranked.slice(winners.length);
  }, [ranked, winners.length]);

  const [leftCol, rightCol] = splitInHalf(rest);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] flex-col gap-0 rounded-none border-0 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 p-[clamp(0.75rem,2vmin,1.5rem)] sm:max-w-[100vw]">
        <DialogHeader className="shrink-0 pb-[clamp(0.5rem,1.5vmin,1rem)]">
          <DialogTitle className="flex items-center gap-2 text-[clamp(1.125rem,0.75rem+1.5vmin,1.75rem)] text-white">
            <Trophy className="h-[clamp(1.25rem,0.85rem+1.5vmin,1.75rem)] w-[clamp(1.25rem,0.85rem+1.5vmin,1.75rem)] text-amber-400" />
            Liga Pauper — {periodLabel}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-[clamp(0.75rem,0.5rem+0.8vmin,0.9375rem)]">
            {eventCount} evento{eventCount !== 1 ? 's' : ''} no período
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto space-y-[clamp(0.75rem,2vmin,1.25rem)]">
          {winners.length > 0 && (
            <div className="space-y-2">
              {winners.map((w) => (
                <WinnerBox key={w.key} row={w} />
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div className="grid grid-cols-1 gap-[clamp(0.75rem,2vmin,1.25rem)] lg:grid-cols-2">
              {[leftCol, rightCol].map((col, colIndex) => (
                <div
                  key={colIndex}
                  className="rounded-xl border border-purple-900/45 bg-slate-900/40 overflow-hidden"
                >
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-transparent">
                        <TableHead className="text-slate-300 w-12">#</TableHead>
                        <TableHead className="text-slate-300">Jogador</TableHead>
                        <TableHead className="text-slate-300 text-right">Pts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {col.map((row) => (
                        <TableRow
                          key={row.key}
                          className="border-slate-700 hover:bg-slate-800/40"
                        >
                          <TableCell className="text-slate-300 tabular-nums">
                            {row.position}
                          </TableCell>
                          <TableCell className="text-white">{row.displayName}</TableCell>
                          <TableCell className="text-right tabular-nums text-purple-300 font-semibold">
                            {row.totalPointsInMonth}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
