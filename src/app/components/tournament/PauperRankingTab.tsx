import { useMemo } from 'react';
import type { Tournament } from '../../types/tournament';
import {
  calculatePauperPlayerStats,
  formatPauperRecordLabel,
  getPauperRecordFromPlayer,
} from '../../utils/pauperScoring';
import { formatPauperTournamentRankingMessage } from '../../utils/pauperLeague';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Copy, Crown, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface PauperRankingTabProps {
  tournament: Tournament;
}

export default function PauperRankingTab({ tournament }: PauperRankingTabProps) {
  const pointsDoubled = tournament.pointsDoubled === true;

  const stats = useMemo(
    () => calculatePauperPlayerStats(tournament.players, pointsDoubled),
    [tournament.players, pointsDoubled]
  );

  const handleCopyRanking = async () => {
    const message = formatPauperTournamentRankingMessage(tournament);
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Ranking copiado!');
    } catch {
      toast.error('Não foi possível copiar o ranking.');
    }
  };

  return (
    <Card className="bg-slate-900/50 border-purple-900/50 backdrop-blur overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Ranking do torneio
            {pointsDoubled && (
              <span className="text-xs font-normal text-amber-400 border border-amber-500/40 rounded px-2 py-0.5">
                Pontos dobrados
              </span>
            )}
          </CardTitle>
          {stats.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-purple-500/50 text-purple-200 hover:bg-purple-950/50 hover:text-white"
              onClick={handleCopyRanking}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar ranking
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {stats.length === 0 ? (
          <p className="text-center py-10 text-slate-500 px-4">
            Adicione jogadores e registre os resultados na aba Jogadores.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-300 w-12">Pos.</TableHead>
                  <TableHead className="text-slate-300">Jogador</TableHead>
                  <TableHead className="text-slate-300 text-center">V/D/E</TableHead>
                  <TableHead className="text-slate-300 text-center hidden sm:table-cell">
                    Aprov.
                  </TableHead>
                  <TableHead className="text-slate-300 text-center">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((s, index) => {
                  const pos = index + 1;
                  const leader = pos === 1 && s.totalPoints > 0;
                  const record = getPauperRecordFromPlayer(
                    tournament.players.find((p) => p.id === s.entryId) ?? {
                      pauperRecord: s.record,
                    }
                  );
                  return (
                    <TableRow
                      key={s.entryId}
                      className={`border-slate-700 ${
                        leader
                          ? 'bg-gradient-to-r from-yellow-900/20 to-transparent'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <TableCell className="text-white font-medium">{pos}</TableCell>
                      <TableCell>
                        <span
                          className={
                            leader
                              ? 'text-yellow-300 font-semibold'
                              : 'text-white'
                          }
                        >
                          {s.playerName}
                          {leader && (
                            <Crown className="w-4 h-4 inline ml-1 text-yellow-400" />
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-slate-300">
                        {formatPauperRecordLabel(record)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-slate-400 hidden sm:table-cell">
                        {record.performancePct !== null
                          ? `${record.performancePct}%`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-purple-300 font-semibold">
                        {s.totalPoints}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
