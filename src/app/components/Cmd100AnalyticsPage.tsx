import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, BarChart3, ChevronDown, Copy, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { useTournaments } from '../context/TournamentContext';
import { aggregateCmd100Analytics, availableCmd100Months, type AnalyticsRow, type DateAttendance } from '../utils/cmd100Analytics';
import { formatCmd100Period, formatCmd100RankingsForCopy, type RankingCopyScope } from '../utils/cmd100RankingCopy';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface RankingCardProps {
  title: string;
  description: string;
  rows: AnalyticsRow[];
  unit: string;
}

function PeriodControls({
  label,
  value,
  months,
  onChange,
}: {
  label: string;
  value: string;
  months: string[];
  onChange: (value: string) => void;
}) {
  const showYear = new Set(months.map((month) => month.slice(0, 4))).size > 1;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={label.replaceAll(' ', '-')} className="text-sm text-slate-300">{label}</label>
      <select
        id={label.replaceAll(' ', '-')}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-purple-700/60 bg-slate-900 px-3 py-2 text-sm text-white [color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
      >
        <option value="all">Todo o período</option>
        {months.map((month) => {
          return <option key={month} value={month}>{formatCmd100Period(month, showYear)}</option>;
        })}
      </select>
    </div>
  );
}

function RankingCard({ title, description, rows, unit }: RankingCardProps) {
  const highest = rows[0]?.count ?? 0;

  return (
    <Card className="border-purple-900/50 bg-slate-900/55 text-white">
      <CardHeader className="gap-1 pb-3">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        <p className="text-sm text-slate-400">{description}</p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Ainda não há dados para este ranking.</p>
        ) : (
          <ol className="max-h-96 space-y-3 overflow-y-auto pr-1" aria-label={title}>
            {rows.map((row) => (
              <li key={row.id} className="relative overflow-hidden rounded-lg border border-slate-700/70 bg-slate-950/45">
                <div
                  className="absolute inset-y-0 left-0 bg-purple-500/15"
                  style={{ width: `${highest > 0 ? (row.count / highest) * 100 : 0}%` }}
                  aria-hidden="true"
                />
                <div className="relative flex items-center gap-3 px-3 py-2.5">
                  <span className="w-7 shrink-0 text-sm font-semibold tabular-nums text-purple-300">{row.rank}º</span>
                  <span className={`min-w-0 flex-1 font-medium text-slate-100 ${row.winDates ? 'break-words' : 'truncate'}`} title={row.label}>
                    {row.label}
                    {row.winDates && row.winDates.length > 0 && (
                      <span className="ml-1.5 text-sm font-normal text-slate-400">({row.winDates.join(', ')})</span>
                    )}
                  </span>
                  <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-white">
                    {row.count} <span className="font-normal text-slate-400">{row.count === 1 ? unit.slice(0, -1) : unit}</span>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function AttendanceChart({ rows, period, months, onPeriodChange }: { rows: DateAttendance[]; period: string; months: string[]; onPeriodChange: (period: string) => void }) {
  const title = 'Jogadores por data de torneio';
  return (
    <Card className="border-purple-900/50 bg-slate-900/55 text-white">
      <CardHeader className="gap-1 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
          <PeriodControls label="Período do gráfico" value={period} months={months} onChange={onPeriodChange} />
        </div>
        <p className="text-sm text-slate-400">Participantes únicos por data com torneio CMD100{period === 'all' ? ' em todo o histórico' : ' no mês selecionado'}.</p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Nenhum torneio CMD100 neste período.</p>
        ) : (
          <div className="overflow-x-auto" role="img" aria-label={rows.map((row) => `${row.label}: ${row.count} jogadores`).join('; ')}>
            <div style={{ minWidth: Math.max(440, rows.length * 72) }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={rows} margin={{ top: 24, right: 12, left: -16, bottom: 4 }} accessibilityLayer>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#cbd5e1', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(label: string) => period === 'all' ? label.slice(0, 6) + label.slice(-2) : label.slice(0, 5)} />
                  <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(168, 85, 247, 0.12)' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #6b21a8', borderRadius: 8, color: '#f8fafc' }}
                    formatter={(value) => [`${value} jogadores`, 'Participantes']}
                  />
                  <Bar dataKey="count" name="Jogadores" fill="#a855f7" radius={[6, 6, 0, 0]} maxBarSize={72}>
                    <LabelList dataKey="count" position="top" fill="#e9d5ff" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Cmd100AnalyticsPage() {
  const { tournaments, loading } = useTournaments();
  const copyMenuRef = useRef<HTMLDetailsElement>(null);
  const [chartPeriod, setChartPeriod] = useState('all');
  const [rankingsPeriod, setRankingsPeriod] = useState('all');
  const months = useMemo(() => availableCmd100Months(tournaments), [tournaments]);
  const selectedChartPeriod = chartPeriod === 'all' || months.includes(chartPeriod) ? chartPeriod : 'all';
  const selectedRankingsPeriod = rankingsPeriod === 'all' || months.includes(rankingsPeriod) ? rankingsPeriod : 'all';
  const chartAnalytics = useMemo(
    () => aggregateCmd100Analytics(tournaments, selectedChartPeriod === 'all' ? undefined : selectedChartPeriod),
    [tournaments, selectedChartPeriod]
  );
  const rankingsAnalytics = useMemo(
    () => aggregateCmd100Analytics(tournaments, selectedRankingsPeriod === 'all' ? undefined : selectedRankingsPeriod),
    [tournaments, selectedRankingsPeriod]
  );

  const copyRankings = async (scope: RankingCopyScope) => {
    if (copyMenuRef.current) copyMenuRef.current.open = false;
    const message = formatCmd100RankingsForCopy(rankingsAnalytics, selectedRankingsPeriod, scope);
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Rankings copiados!');
    } catch {
      toast.error('Não foi possível copiar os rankings.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      <main className="container mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <Button variant="ghost" asChild className="mb-4 text-slate-300 hover:text-white">
          <Link to="/"><ArrowLeft className="mr-2 size-4" />Início</Link>
        </Button>

        <div className="mb-7 flex items-start gap-3">
          <BarChart3 className="mt-1 size-7 shrink-0 text-purple-300" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Analytics CMD100</h1>
            <p className="mt-1 text-sm text-slate-400">
              Participação e vitórias da Liga CMD100 semanal.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-slate-300" role="status">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />Carregando analytics...
          </div>
        ) : (
          <div className="space-y-4">
            <AttendanceChart
              rows={chartAnalytics.datesByAttendance}
              period={selectedChartPeriod}
              months={months}
              onPeriodChange={setChartPeriod}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-purple-900/50 bg-slate-900/55 px-4 py-3">
              <h2 className="text-lg font-semibold text-white">Rankings</h2>
              <div className="flex flex-wrap items-center gap-2">
                <PeriodControls label="Período dos rankings" value={selectedRankingsPeriod} months={months} onChange={setRankingsPeriod} />
                <details ref={copyMenuRef} className="group">
                  <summary className="inline-flex h-9 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-purple-700/60 bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 [&::-webkit-details-marker]:hidden">
                    <Copy className="size-4" aria-hidden="true" />Copiar rankings<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="mt-2 flex flex-col rounded-md border border-purple-700/60 bg-slate-900 p-1 text-white shadow-lg">
                    <button type="button" onClick={() => void copyRankings('all')} className="rounded px-3 py-2 text-left text-sm hover:bg-slate-800 focus-visible:bg-slate-800 focus-visible:outline-none">Copiar tudo</button>
                    <button type="button" onClick={() => void copyRankings(1)} className="rounded px-3 py-2 text-left text-sm hover:bg-slate-800 focus-visible:bg-slate-800 focus-visible:outline-none">Copiar top 1</button>
                    <button type="button" onClick={() => void copyRankings(3)} className="rounded px-3 py-2 text-left text-sm hover:bg-slate-800 focus-visible:bg-slate-800 focus-visible:outline-none">Copiar top 3</button>
                  </div>
                </details>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <RankingCard
                title="Jogadores mais presentes"
                description={selectedRankingsPeriod === 'all' ? 'Quantidade de torneios CMD100 disputados em todo o histórico.' : 'Quantidade de torneios CMD100 disputados no mês selecionado.'}
                rows={rankingsAnalytics.playersByAttendance}
                unit="torneios"
              />
              <RankingCard
                title="Mais vitórias em mesas"
                description={selectedRankingsPeriod === 'all' ? 'Primeiros lugares em mesas com resultados completos em todo o histórico.' : 'Primeiros lugares em mesas com resultados completos no mês selecionado.'}
                rows={rankingsAnalytics.playersByTableWins}
                unit="vitórias"
              />
              <RankingCard
                title="Mais vitórias em torneios"
                description={selectedRankingsPeriod === 'all' ? 'Primeiros lugares na classificação final dos torneios concluídos em todo o histórico.' : 'Primeiros lugares na classificação final dos torneios concluídos no mês selecionado.'}
                rows={rankingsAnalytics.playersByTournamentWins}
                unit="vitórias"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
