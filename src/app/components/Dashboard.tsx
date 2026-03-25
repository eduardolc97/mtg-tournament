import { useMemo } from 'react';
import { Link } from 'react-router';
import { useTournaments } from '../context/TournamentContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import {
  Trophy,
  Users,
  Calendar,
  Plus,
  Loader2,
  ListOrdered,
  Armchair,
} from 'lucide-react';
import {
  normalizeTournamentModality,
  tournamentModalityLabelPt,
  type TournamentModality,
} from '../constants/tournamentModality';
import { monthLabel } from '../utils/monthlyLeague';
import type { Tournament } from '../types/tournament';
import PageHeaderBrand from './PageHeaderBrand';

function sortByCreatedDesc(a: Tournament, b: Tournament): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function leagueMonthSortKey(t: Tournament): string {
  return `${t.leagueYear}-${String(t.leagueMonth).padStart(2, '0')}`;
}

function groupDashboardTournaments(tournaments: Tournament[]): {
  weekly: Tournament[];
  weeklyByMonth: Map<string, Tournament[]>;
  monthKeysDesc: string[];
  doubles: Tournament[];
  open: Tournament[];
} {
  const weekly: Tournament[] = [];
  const doubles: Tournament[] = [];
  const open: Tournament[] = [];
  for (const t of tournaments) {
    const m = normalizeTournamentModality(t.modality);
    if (m === 'weekly_cmd100') {
      weekly.push(t);
    } else if (m === 'doubles_cmd') {
      doubles.push(t);
    } else {
      open.push(t);
    }
  }
  weekly.sort(sortByCreatedDesc);
  doubles.sort(sortByCreatedDesc);
  open.sort(sortByCreatedDesc);

  const weeklyByMonth = new Map<string, Tournament[]>();
  for (const t of weekly) {
    const k = leagueMonthSortKey(t);
    const list = weeklyByMonth.get(k);
    if (list) {
      list.push(t);
    } else {
      weeklyByMonth.set(k, [t]);
    }
  }
  const monthKeysDesc = [...weeklyByMonth.keys()].sort((a, b) =>
    b.localeCompare(a, 'en')
  );

  return { weekly, weeklyByMonth, monthKeysDesc, doubles, open };
}

function parseLeagueMonthKey(key: string): { year: number; month: number } {
  const [ys, ms] = key.split('-');
  return { year: parseInt(ys, 10), month: parseInt(ms, 10) };
}

interface TournamentListCardProps {
  tournament: Tournament;
  showLeaguePeriod: boolean;
}

function TournamentListCard({
  tournament,
  showLeaguePeriod,
}: TournamentListCardProps) {
  const modality = normalizeTournamentModality(tournament.modality);
  return (
    <Link to={`/tournament/${tournament.id}`}>
      <Card className="bg-slate-900/50 border-purple-900/50 backdrop-blur hover:bg-slate-900/70 hover:border-purple-700/50 transition-all cursor-pointer group hover:shadow-lg hover:shadow-purple-500/20 h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-white group-hover:text-purple-300 transition-colors text-base leading-snug">
            {tournament.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{tournament.players.length} jogadores</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400 shrink-0" />
              <span>
                {tournament.rounds.length} rodada
                {tournament.rounds.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="text-slate-400">
              {tournamentModalityLabelPt(modality)}
            </span>
            {showLeaguePeriod && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-purple-300/90 capitalize">
                  {monthLabel(tournament.leagueYear, tournament.leagueMonth)}
                </span>
              </>
            )}
            <span className="text-slate-600">·</span>
            <span>
              Criado em{' '}
              {new Date(tournament.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const MODALITY_SECTION_ORDER: {
  value: string;
  modality: TournamentModality;
  title: string;
  description: string;
}[] = [
    {
      value: 'weekly_cmd100',
      modality: 'weekly_cmd100',
      title: 'Liga CMD 100 semanal',
      description: 'Torneios que entram na classificação mensal da liga.',
    },
    {
      value: 'doubles_cmd',
      modality: 'doubles_cmd',
      title: 'CMD em duplas',
      description: 'Mesas 2×2 e ranking por dupla.',
    },
    {
      value: 'cmd_open_table',
      modality: 'cmd_open_table',
      title: 'CMD mesão livre',
      description: 'Mesmo formato da liga; rótulo de evento aberto.',
    },
  ];

export default function Dashboard() {
  const { tournaments, loading } = useTournaments();

  const grouped = useMemo(
    () => groupDashboardTournaments(tournaments),
    [tournaments]
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      <div className="container mx-auto px-3 py-6 max-w-6xl sm:px-4 sm:py-8 [@media(orientation:landscape)_and_(max-height:500px)]:py-4 [@media(orientation:landscape)_and_(max-height:500px)]:px-3">
        <div className="text-center mb-8 sm:mb-12 [@media(orientation:landscape)_and_(max-height:500px)]:mb-4">
          <PageHeaderBrand
            variant="dashboard"
            justify="center"
            className="mb-3 sm:mb-4 [@media(orientation:landscape)_and_(max-height:500px)]:mb-2"
          >
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent [@media(orientation:landscape)_and_(max-height:500px)]:text-xl">
              Torneios 2 Irmãos
            </h1>
          </PageHeaderBrand>
          <p className="text-slate-300 text-sm sm:text-lg [@media(orientation:landscape)_and_(max-height:500px)]:text-xs">
            Gerencie torneios de Magic: The Gathering - EDH
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 mb-6 sm:mb-8 [@media(orientation:landscape)_and_(max-height:500px)]:mb-4">
          <Link to="/create">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 transition-all"
            >
              <Plus className="w-5 h-5 mr-2" />
              Novo Campeonato
            </Button>
          </Link>
          <Link to="/liga">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-purple-500/50 text-purple-200 hover:bg-purple-950/50 hover:text-white"
            >
              <ListOrdered className="w-5 h-5 mr-2" />
              Liga do mês
            </Button>
          </Link>
        </div>

        {/* Tournament List */}
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2 [@media(orientation:landscape)_and_(max-height:500px)]:text-lg [@media(orientation:landscape)_and_(max-height:500px)]:mb-3">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 shrink-0" />
            Campeonatos
          </h2>

          {loading ? (
            <Card className="bg-slate-900/50 border-slate-700 backdrop-blur">
              <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
                <p>Carregando campeonatos…</p>
              </CardContent>
            </Card>
          ) : tournaments.length === 0 ? (
            <Card className="bg-slate-900/50 border-slate-700 backdrop-blur">
              <CardContent className="py-12 text-center">
                <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Nenhum campeonato criado ainda.</p>
                <p className="text-slate-500 text-sm mt-2">
                  Crie seu primeiro campeonato para começar!
                </p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" defaultValue={[]} className="space-y-3">
              {MODALITY_SECTION_ORDER.map((section) => {
                const isWeekly = section.modality === 'weekly_cmd100';
                const isDoubles = section.modality === 'doubles_cmd';
                const list = isWeekly
                  ? grouped.weekly
                  : isDoubles
                    ? grouped.doubles
                    : grouped.open;
                const count = list.length;

                return (
                  <AccordionItem
                    key={section.value}
                    value={section.value}
                    className="rounded-xl border border-slate-700/70 bg-slate-900/35 px-1 data-[state=open]:border-purple-800/45"
                  >
                    <AccordionTrigger className="px-3 py-3 text-left text-base font-semibold text-white hover:no-underline hover:bg-slate-800/35 rounded-lg [&>svg]:text-purple-300">
                      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                        <span className="flex items-center gap-2 shrink-0">
                          {isWeekly ? (
                            <ListOrdered
                              className="size-5 text-amber-400 shrink-0"
                              aria-hidden
                            />
                          ) : isDoubles ? (
                            <Users
                              className="size-5 text-cyan-400 shrink-0"
                              aria-hidden
                            />
                          ) : (
                            <Armchair
                              className="size-5 text-emerald-400 shrink-0"
                              aria-hidden
                            />
                          )}
                          {section.title}
                        </span>
                        <span className="text-sm font-normal text-slate-400 sm:ml-auto">
                          {count === 0
                            ? 'vazio'
                            : `${count} campeonato${count !== 1 ? 's' : ''}`}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-3 sm:px-3">
                      <p className="mb-3 text-xs text-slate-500 sm:text-sm">
                        {section.description}
                      </p>
                      {count === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-600/60 bg-slate-950/30 py-6 text-center text-sm text-slate-500">
                          Nenhum campeonato nesta pasta.
                        </p>
                      ) : isWeekly ? (
                        <div className="space-y-5">
                          {grouped.monthKeysDesc.map((key) => {
                            const inMonth = grouped.weeklyByMonth.get(key) ?? [];
                            const { year, month } = parseLeagueMonthKey(key);
                            return (
                              <div
                                key={key}
                                className="rounded-lg border border-amber-900/35 bg-slate-950/45 p-3 sm:p-4"
                              >
                                <h3 className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-amber-100 sm:text-base">
                                  <Calendar
                                    className="size-4 shrink-0 text-amber-400/90"
                                    aria-hidden
                                  />
                                  <span className="capitalize">
                                    {monthLabel(year, month)}
                                  </span>
                                  <span className="font-normal text-slate-500">
                                    ({inMonth.length})
                                  </span>
                                </h3>
                                <div className="grid grid-cols-1 [@media(orientation:landscape)_and_(max-height:500px)]:grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
                                  {inMonth.map((tournament) => (
                                    <TournamentListCard
                                      key={tournament.id}
                                      tournament={tournament}
                                      showLeaguePeriod={false}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 [@media(orientation:landscape)_and_(max-height:500px)]:grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
                          {list.map((tournament) => (
                            <TournamentListCard
                              key={tournament.id}
                              tournament={tournament}
                              showLeaguePeriod
                            />
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  );
}
