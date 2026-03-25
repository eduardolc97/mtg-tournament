import { useMemo } from 'react';
import { Tournament } from '../../types/tournament';
import { normalizeTournamentModality } from '../../constants/tournamentModality';
import {
  calculateDoublesTeamStats,
  calculatePlayerStats,
} from '../../utils/tournamentRanking';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Trophy, Crown, Users } from 'lucide-react';

interface RankingTabProps {
  tournament: Tournament;
}

export default function RankingTab({ tournament }: RankingTabProps) {
  const doubles =
    normalizeTournamentModality(tournament.modality) === 'doubles_cmd';
  const stats = calculatePlayerStats(tournament);
  const teamStats = doubles ? calculateDoublesTeamStats(tournament) : [];

  const roundNumbers = useMemo(() => {
    const nums = [
      ...new Set(tournament.rounds.map((r) => r.number)),
    ].sort((a, b) => a - b);
    return nums;
  }, [tournament.rounds]);

  const displayStats = doubles ? teamStats : stats;
  const empty =
    displayStats.length === 0 ||
    displayStats.every((s) => s.totalPoints === 0);

  if (empty) {
    return (
      <Card className="bg-slate-900/50 border-purple-900/50 backdrop-blur">
        <CardContent className="py-12 text-center">
          <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Nenhum resultado registrado ainda.</p>
          <p className="text-slate-500 text-sm mt-2">
            Complete as rodadas para ver o ranking.
          </p>
        </CardContent>
      </Card>
    );
  }

  const roundCell = (roundNum: number, value: number) => {
    const roundOk = tournament.rounds.some((r) => r.number === roundNum);
    if (!roundOk) {
      return (
        <span className="text-slate-500 tabular-nums">—</span>
      );
    }
    return (
      <span className="text-white tabular-nums">{value}</span>
    );
  };

  return (
    <Card className="bg-slate-900/50 border-purple-900/50 backdrop-blur overflow-hidden">
      <CardHeader className="[@media(orientation:landscape)_and_(max-height:500px)]:py-3">
        <CardTitle className="text-white flex items-center gap-2 text-lg [@media(orientation:landscape)_and_(max-height:500px)]:text-base">
          {doubles ? (
            <Users className="w-5 h-5 text-yellow-400 shrink-0" />
          ) : (
            <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
          )}
          {doubles ? 'Classificação por dupla' : 'Classificação geral'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-300 w-14 min-w-[3rem]">
                  Pos.
                </TableHead>
                <TableHead className="text-slate-300 min-w-[140px]">
                  {doubles ? 'Dupla' : 'Jogador'}
                </TableHead>
                {roundNumbers.map((n) => (
                  <TableHead
                    key={n}
                    className="text-slate-300 text-center w-14 px-1 whitespace-nowrap"
                  >
                    R{n}
                  </TableHead>
                ))}
                <TableHead className="text-slate-300 text-center w-16 px-1">
                  Tot.
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doubles
                ? teamStats.map((row, index) => {
                    const position = index + 1;
                    const isLeader = position === 1 && row.totalPoints > 0;
                    return (
                      <TableRow
                        key={row.teamKey}
                        className={`border-slate-700 ${
                          isLeader
                            ? 'bg-gradient-to-r from-yellow-900/20 to-transparent hover:from-yellow-900/30'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <TableCell className="py-2 [@media(orientation:landscape)_and_(max-height:500px)]:py-1">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold text-sm">
                            {position}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 [@media(orientation:landscape)_and_(max-height:500px)]:py-1">
                          <span
                            className={`${isLeader ? 'text-yellow-300 font-semibold' : 'text-white'} text-sm [@media(orientation:landscape)_and_(max-height:500px)]:text-xs`}
                          >
                            {row.label}
                            {isLeader && (
                              <Crown className="w-4 h-4 inline ml-1 text-yellow-400" />
                            )}
                          </span>
                        </TableCell>
                        {roundNumbers.map((n) => (
                          <TableCell
                            key={n}
                            className="text-center py-2 [@media(orientation:landscape)_and_(max-height:500px)]:py-1"
                          >
                            {roundCell(
                              n,
                              row.pointsByRound[n - 1] ?? 0
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-center py-2 [@media(orientation:landscape)_and_(max-height:500px)]:py-1">
                          <span
                            className={`font-bold tabular-nums ${isLeader ? 'text-yellow-400 text-base' : 'text-purple-400'}`}
                          >
                            {row.totalPoints}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                : stats.map((player, index) => {
                    const position = index + 1;
                    const isLeader = position === 1 && player.totalPoints > 0;

                    return (
                      <TableRow
                        key={player.playerId}
                        className={`border-slate-700 ${
                          isLeader
                            ? 'bg-gradient-to-r from-yellow-900/20 to-transparent hover:from-yellow-900/30'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <TableCell className="py-2 [@media(orientation:landscape)_and_(max-height:500px)]:py-1">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold text-sm">
                            {position}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 [@media(orientation:landscape)_and_(max-height:500px)]:py-1">
                          <span
                            className={`${isLeader ? 'text-yellow-300 font-semibold' : 'text-white'} text-sm [@media(orientation:landscape)_and_(max-height:500px)]:text-xs`}
                          >
                            {player.playerName}
                            {isLeader && (
                              <Crown className="w-4 h-4 inline ml-1 text-yellow-400" />
                            )}
                          </span>
                        </TableCell>
                        {roundNumbers.map((n) => (
                          <TableCell
                            key={n}
                            className="text-center py-2 [@media(orientation:landscape)_and_(max-height:500px)]:py-1"
                          >
                            {roundCell(
                              n,
                              player.pointsByRound[n - 1] ?? 0
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="text-center py-2 [@media(orientation:landscape)_and_(max-height:500px)]:py-1">
                          <span
                            className={`font-bold tabular-nums ${isLeader ? 'text-yellow-400 text-base' : 'text-purple-400'}`}
                          >
                            {player.totalPoints}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
