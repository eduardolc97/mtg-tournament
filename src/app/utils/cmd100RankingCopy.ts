import type { AnalyticsRow, Cmd100Analytics } from './cmd100Analytics';

export type RankingCopyScope = 'all' | 1 | 3;

export function formatCmd100Period(period: string, includeYear = false): string {
  if (period === 'all') return 'Todo o período';
  const [year, month] = period.split('-').map(Number);
  const name = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
  return includeYear ? `${name} de ${year}` : name;
}

export function formatCmd100RankingsForCopy(
  analytics: Cmd100Analytics,
  period: string,
  scope: RankingCopyScope
): string {
  const formatRanking = (title: string, rows: AnalyticsRow[], unit: string) => {
    const selected = scope === 'all' ? rows : rows.filter((row) => row.rank <= scope);
    return [
      title,
      ...(selected.length > 0
        ? selected.map((row) => {
            const label = row.winDates?.length ? `${row.label} (${row.winDates.join(', ')})` : row.label;
            return `${row.rank}º ${label} — ${row.count} ${row.count === 1 ? unit.slice(0, -1) : unit}`;
          })
        : ['Ainda não há dados para este ranking.']),
    ].join('\n');
  };

  return [
    `Rankings CMD100 — ${formatCmd100Period(period, true)}`,
    formatRanking('Jogadores mais presentes', analytics.playersByAttendance, 'torneios'),
    formatRanking('Mais vitórias em mesas', analytics.playersByTableWins, 'vitórias'),
    formatRanking('Mais vitórias em torneios', analytics.playersByTournamentWins, 'vitórias'),
  ].join('\n\n');
}
