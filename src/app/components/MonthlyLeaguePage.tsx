import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTournaments } from '../context/TournamentContext';
import { LEAGUE_MONTHS_PT, leagueYearOptions } from '../constants/leaguePeriod';
import { countsTowardMonthlyLeague } from '../constants/tournamentModality';
import {
  aggregateMonthlyLeague,
  monthLabel,
} from '../utils/monthlyLeague';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ArrowLeft, Crown, Loader2, Trophy } from 'lucide-react';

function parseQueryInt(
  params: URLSearchParams,
  key: string,
  fallback: number
): number {
  const raw = params.get(key);
  if (raw === null || raw === '') {
    return fallback;
  }
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export default function MonthlyLeaguePage() {
  const { tournaments, loading } = useTournaments();
  const [searchParams, setSearchParams] = useSearchParams();

  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth() + 1;

  const year = parseQueryInt(searchParams, 'year', defaultYear);
  const month = (() => {
    const m = parseQueryInt(searchParams, 'month', defaultMonth);
    if (m < 1) {
      return 1;
    }
    if (m > 12) {
      return 12;
    }
    return m;
  })();

  const rows = useMemo(
    () => aggregateMonthlyLeague(tournaments, year, month),
    [tournaments, year, month]
  );

  const eventCount = useMemo(
    () =>
      tournaments.filter(
        (t) =>
          t.leagueYear === year &&
          t.leagueMonth === month &&
          countsTowardMonthlyLeague(t.modality)
      ).length,
    [tournaments, year, month]
  );

  const excludedFromLeagueCount = useMemo(
    () =>
      tournaments.filter(
        (t) =>
          t.leagueYear === year &&
          t.leagueMonth === month &&
          !countsTowardMonthlyLeague(t.modality)
      ).length,
    [tournaments, year, month]
  );

  const setPeriod = (y: number, m: number) => {
    setSearchParams({ year: String(y), month: String(m) });
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      <div className="container mx-auto px-3 py-6 max-w-4xl sm:px-4 sm:py-8">
        <Button
          variant="ghost"
          asChild
          className="text-slate-300 hover:text-white mb-4"
        >
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Início
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-10 h-10 text-yellow-400 shrink-0" />
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Liga mensal
          </h1>
        </div>
        <p className="text-slate-400 text-sm mb-6 max-w-xl">
          Soma de pontos só dos campeonatos na modalidade{' '}
          <span className="text-slate-300">Liga CMD 100 semanal</span> (CMD em
          duplas e CMD mesão livre não entram). Mesmo nome de jogador em
          eventos diferentes entra junto. Vitórias = quantas vezes ficou em 1º
          no campeonato.
        </p>

        <Card className="bg-slate-900/50 border-purple-900/50 backdrop-blur mb-6">
          <CardHeader>
            <CardTitle className="text-white text-base">
              Período da liga
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <p className="text-xs text-slate-400">Mês</p>
              <Select
                value={String(month)}
                onValueChange={(v) => setPeriod(year, parseInt(v, 10))}
              >
                <SelectTrigger className="w-[180px] bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {LEAGUE_MONTHS_PT.map((m) => (
                    <SelectItem
                      key={m.value}
                      value={String(m.value)}
                      className="text-white"
                    >
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-400">Ano</p>
              <Select
                value={String(year)}
                onValueChange={(v) => setPeriod(parseInt(v, 10), month)}
              >
                <SelectTrigger className="w-[120px] bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {leagueYearOptions().map((y) => (
                    <SelectItem
                      key={y}
                      value={String(y)}
                      className="text-white"
                    >
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="py-12 flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
              <p>Carregando…</p>
            </CardContent>
          </Card>
        ) : eventCount === 0 ? (
          <Card className="bg-slate-900/50 border-purple-900/50">
            <CardContent className="py-12 text-center text-slate-400 space-y-2">
              {excludedFromLeagueCount > 0 ? (
                <>
                  <p>
                    Há {excludedFromLeagueCount} campeonato
                    {excludedFromLeagueCount !== 1 ? 's' : ''} em{' '}
                    {monthLabel(year, month)}, mas nenhum na modalidade Liga CMD
                    100 semanal — por isso a liga mensal está vazia.
                  </p>
                  <p className="text-slate-500 text-sm">
                    Duplas e mesão livre não contam para esta classificação.
                  </p>
                </>
              ) : (
                <p>
                  Nenhum campeonato em {monthLabel(year, month)}. Crie um torneio
                  escolhendo esse mês e ano.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-900/50 border-purple-900/50 backdrop-blur overflow-hidden">
            <CardHeader>
              <CardTitle className="text-white flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="capitalize">{monthLabel(year, month)}</span>
                <span className="text-sm font-normal text-slate-400 text-right">
                  {eventCount} campeonato{eventCount !== 1 ? 's' : ''} (Liga CMD
                  100 semanal)
                  {excludedFromLeagueCount > 0 ? (
                    <span className="block text-slate-500 mt-1">
                      +{excludedFromLeagueCount} outro
                      {excludedFromLeagueCount !== 1 ? 's' : ''} no mês (fora da
                      liga)
                    </span>
                  ) : null}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-transparent">
                      <TableHead className="text-slate-300 w-12">Pos.</TableHead>
                      <TableHead className="text-slate-300">Jogador</TableHead>
                      <TableHead className="text-slate-300 text-center">
                        Pontos (mês)
                      </TableHead>
                      <TableHead className="text-slate-300 text-center">
                        1º lugares
                      </TableHead>
                      <TableHead className="text-slate-300 text-center hidden sm:table-cell">
                        Eventos
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => {
                      const pos = index + 1;
                      const leader = pos === 1 && row.totalPointsInMonth > 0;
                      return (
                        <TableRow
                          key={row.key}
                          className={`border-slate-700 ${
                            leader
                              ? 'bg-gradient-to-r from-yellow-900/20 to-transparent'
                              : 'hover:bg-slate-800/50'
                          }`}
                        >
                          <TableCell className="text-white font-medium">
                            {pos}
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                leader
                                  ? 'text-yellow-300 font-semibold'
                                  : 'text-white'
                              }
                            >
                              {row.displayName}
                              {leader && (
                                <Crown className="w-4 h-4 inline ml-1 text-yellow-400" />
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-purple-300 font-semibold">
                            {row.totalPointsInMonth}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-slate-200">
                            {row.firstPlaceCount}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-slate-400 hidden sm:table-cell">
                            {row.tournamentsPlayed}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
