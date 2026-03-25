import { useState, useEffect, useMemo } from 'react';
import { Table, TableResult, TableOutcome } from '../../types/tournament';
import { useTournaments } from '../../context/TournamentContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Users, Trophy, Medal, Award, Check, Equal } from 'lucide-react';
import {
  POINTS_MAP,
  pointsFromOutcome,
  outcomeLabel,
} from '../../utils/scoring';
import {
  buildDoublesTeamTableResults,
  parseDoublesMesaOutcomeFromResults,
  mesaOutcomeLabelPt,
  type DoublesMesaOutcome,
} from '../../utils/doublesTableScoring';
import { toast } from 'sonner';

interface TableCardProps {
  table: Table;
  tableNumber: number;
  tournamentId: string;
  roundId: string;
  doublesTableLayout?: boolean;
  doublesTeamScoring?: boolean;
}

const positionIcons = {
  1: Trophy,
  2: Medal,
  3: Award,
  4: Users,
};

const positionColors: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-400',
  3: 'text-orange-600',
  4: 'text-slate-500',
};

function outcomeToSelectValue(outcome: TableOutcome): string {
  if (outcome.type === 'tie') {
    return 'tie';
  }
  return `place:${outcome.place}`;
}

function selectValueToOutcome(value: string): TableOutcome | null {
  if (value === 'tie') {
    return { type: 'tie' };
  }
  if (value.startsWith('place:')) {
    const n = parseInt(value.slice(6), 10);
    if (n >= 1 && n <= 4) {
      return { type: 'place', place: n as 1 | 2 | 3 | 4 };
    }
  }
  return null;
}

function buildResultsFromSelections(
  table: Table,
  selections: Record<string, string>
): TableResult[] | null {
  const maxPlace = table.players.length;
  for (const p of table.players) {
    if (!selections[p.id]) {
      return null;
    }
  }
  const outcomes: TableOutcome[] = [];
  for (const p of table.players) {
    const o = selectValueToOutcome(selections[p.id]);
    if (!o) {
      return null;
    }
    if (o.type === 'place' && (o.place < 1 || o.place > maxPlace)) {
      return null;
    }
    outcomes.push(o);
  }
  const usedPlaces = new Set<number>();
  for (const o of outcomes) {
    if (o.type === 'place') {
      if (usedPlaces.has(o.place)) {
        return null;
      }
      usedPlaces.add(o.place);
    }
  }
  return table.players.map((player) => {
    const o = selectValueToOutcome(selections[player.id])!;
    return {
      playerId: player.id,
      outcome: o,
      points: pointsFromOutcome(o, maxPlace),
    };
  });
}

function resultsEqual(a: TableResult[] | undefined, b: TableResult[]): boolean {
  if (!a || a.length !== b.length) {
    return false;
  }
  const byId = new Map(b.map((r) => [r.playerId, r]));
  return a.every((r) => {
    const x = byId.get(r.playerId);
    if (!x || r.points !== x.points) {
      return false;
    }
    if (r.outcome.type !== x.outcome.type) {
      return false;
    }
    if (r.outcome.type === 'tie' && x.outcome.type === 'tie') {
      return true;
    }
    if (r.outcome.type === 'place' && x.outcome.type === 'place') {
      return r.outcome.place === x.outcome.place;
    }
    return false;
  });
}

const MESA_SELECT_EMPTY = '__none__';

export default function TableCard({
  table,
  tableNumber,
  tournamentId,
  roundId,
  doublesTableLayout = false,
  doublesTeamScoring = false,
}: TableCardProps) {
  const { updateTableResults } = useTournaments();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [mesaOutcome, setMesaOutcome] = useState<DoublesMesaOutcome | ''>('');

  const maxPlace = table.players.length;

  useEffect(() => {
    if (doublesTeamScoring && table.players.length === 4) {
      if (table.results && table.results.length === 4) {
        const p = parseDoublesMesaOutcomeFromResults(
          table.results,
          table.players
        );
        setMesaOutcome(p ?? '');
      } else {
        setMesaOutcome('');
      }
      setSelections({});
      return;
    }
    setMesaOutcome('');
    if (table.results && table.results.length === table.players.length) {
      const next: Record<string, string> = {};
      table.results.forEach((result) => {
        next[result.playerId] = outcomeToSelectValue(result.outcome);
      });
      setSelections(next);
    } else {
      setSelections({});
    }
  }, [
    table.results,
    table.players,
    table.players.length,
    doublesTeamScoring,
    table.id,
  ]);

  const handleChange = (playerId: string, value: string) => {
    setSelections((prev) => ({
      ...prev,
      [playerId]: value,
    }));
  };

  const draftResults = useMemo(() => {
    if (doublesTeamScoring && table.players.length === 4) {
      if (!mesaOutcome) {
        return null;
      }
      return buildDoublesTeamTableResults(table.players, mesaOutcome);
    }
    return buildResultsFromSelections(table, selections);
  }, [doublesTeamScoring, table, mesaOutcome, selections]);

  const handleSaveResults = async () => {
    if (!draftResults) {
      toast.error(
        doublesTeamScoring
          ? 'Escolha o resultado da mesa (vitória de uma dupla ou empate)'
          : 'Defina resultado válido para todos (lugares não podem repetir, exceto empate)'
      );
      return;
    }
    try {
      await updateTableResults(tournamentId, roundId, table.id, draftResults);
      toast.success('Resultados salvos!');
    } catch {
      toast.error('Não foi possível salvar os resultados. Verifique se a API está rodando.');
    }
  };

  const isComplete =
    table.results && table.results.length === table.players.length;
  const hasUnsavedChanges =
    draftResults !== null &&
    (!table.results || !resultsEqual(table.results, draftResults));

  const placeOptions = useMemo(
    () => Array.from({ length: maxPlace }, (_, i) => i + 1),
    [maxPlace]
  );

  const playerBlocks: Player[][] =
    doublesTableLayout && table.players.length === 4
      ? [
          [table.players[0], table.players[1]],
          [table.players[2], table.players[3]],
        ]
      : table.players.map((p) => [p]);

  const mesaSelectValue =
    mesaOutcome === '' ? MESA_SELECT_EMPTY : mesaOutcome;

  const teamPreviewPts = useMemo(() => {
    if (
      !doublesTeamScoring ||
      table.players.length !== 4 ||
      !mesaOutcome
    ) {
      return null;
    }
    const r = buildDoublesTeamTableResults(table.players, mesaOutcome);
    const byId = new Map(r.map((x) => [x.playerId, x.points]));
    return {
      dupla1: byId.get(table.players[0].id) ?? 0,
      dupla2: byId.get(table.players[2].id) ?? 0,
    };
  }, [doublesTeamScoring, table.players, mesaOutcome]);

  return (
    <Card
      className={`backdrop-blur ${
        isComplete && !hasUnsavedChanges
          ? 'bg-slate-900/50 border-green-900/50'
          : 'bg-slate-900/50 border-purple-900/50'
      }`}
    >
      <CardHeader className="[@media(orientation:landscape)_and_(max-height:500px)]:py-2 [@media(orientation:landscape)_and_(max-height:500px)]:px-4">
        <CardTitle className="text-white flex items-center gap-2 flex-wrap text-base [@media(orientation:landscape)_and_(max-height:500px)]:text-sm">
          <Users
            className={`w-5 h-5 shrink-0 ${isComplete && !hasUnsavedChanges ? 'text-green-400' : 'text-purple-400'} [@media(orientation:landscape)_and_(max-height:500px)]:w-4 [@media(orientation:landscape)_and_(max-height:500px)]:h-4`}
          />
          Mesa {tableNumber}
          {table.isLeadersTable && (
            <span className="text-xs font-semibold uppercase tracking-wide bg-violet-500/20 text-violet-200 px-2 py-0.5 rounded border border-violet-500/40">
              Líderes
            </span>
          )}
          {table.isFinalTable && (
            <span className="text-xs font-semibold uppercase tracking-wide bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
              Final
            </span>
          )}
          {isComplete && !hasUnsavedChanges && (
            <Check className="w-5 h-5 text-green-400 ml-auto shrink-0" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="[@media(orientation:landscape)_and_(max-height:500px)]:px-4 [@media(orientation:landscape)_and_(max-height:500px)]:pb-3">
        {doublesTeamScoring && table.players.length === 4 ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-purple-400/90 mb-2">
                Dupla 1
              </p>
              <p className="text-white text-sm">
                {table.players[0].name} · {table.players[1].name}
              </p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-cyan-400/90 mb-2">
                Dupla 2
              </p>
              <p className="text-white text-sm">
                {table.players[2].name} · {table.players[3].name}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-400">Resultado da mesa (pontuação por dupla)</p>
              <Select
                value={mesaSelectValue}
                onValueChange={(v) => {
                  if (v === MESA_SELECT_EMPTY) {
                    setMesaOutcome('');
                    return;
                  }
                  setMesaOutcome(v as DoublesMesaOutcome);
                }}
              >
                <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white text-sm">
                  <SelectValue placeholder="Resultado da mesa" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem
                    value={MESA_SELECT_EMPTY}
                    className="text-slate-400"
                  >
                    Selecionar…
                  </SelectItem>
                  <SelectItem
                    value="team1_wins"
                    className="text-white hover:bg-slate-700"
                  >
                    {mesaOutcomeLabelPt('team1_wins')} (5 pts / dupla)
                  </SelectItem>
                  <SelectItem
                    value="team2_wins"
                    className="text-white hover:bg-slate-700"
                  >
                    {mesaOutcomeLabelPt('team2_wins')} (5 pts / dupla)
                  </SelectItem>
                  <SelectItem
                    value="tie"
                    className="text-white hover:bg-slate-700"
                  >
                    {mesaOutcomeLabelPt('tie')} (1 pt / dupla)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {teamPreviewPts && (
              <p className="text-xs text-slate-500">
                Nesta rodada: dupla 1 →{' '}
                <span className="text-yellow-400/90 tabular-nums font-semibold">
                  {teamPreviewPts.dupla1}
                </span>{' '}
                pts · dupla 2 →{' '}
                <span className="text-yellow-400/90 tabular-nums font-semibold">
                  {teamPreviewPts.dupla2}
                </span>{' '}
                pts
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 [@media(orientation:landscape)_and_(max-height:500px)]:space-y-3">
            {playerBlocks.map((block, blockIndex) => (
              <div
                key={block.map((p) => p.id).join('-')}
                className={
                  doublesTableLayout && blockIndex > 0
                    ? 'border-t border-slate-700/80 pt-3 [@media(orientation:landscape)_and_(max-height:500px)]:pt-2'
                    : ''
                }
              >
                {doublesTableLayout && (
                  <p className="text-xs font-medium uppercase tracking-wide text-purple-400/90 mb-2 [@media(orientation:landscape)_and_(max-height:500px)]:mb-1.5">
                    Dupla {blockIndex + 1}
                  </p>
                )}
                <div className="space-y-2 [@media(orientation:landscape)_and_(max-height:500px)]:space-y-1.5">
                  {block.map((player) => {
                    const value = selections[player.id];
                    const outcome = value ? selectValueToOutcome(value) : null;
                    const Icon =
                      outcome?.type === 'tie'
                        ? Equal
                        : outcome?.type === 'place'
                          ? positionIcons[
                              outcome.place as keyof typeof positionIcons
                            ] ?? Users
                          : Users;
                    const color =
                      outcome?.type === 'place'
                        ? positionColors[outcome.place] ?? 'text-slate-400'
                        : outcome?.type === 'tie'
                          ? 'text-cyan-400'
                          : 'text-slate-400';

                    const usedByOthers = new Set<number>();
                    for (const p of table.players) {
                      if (p.id === player.id) {
                        continue;
                      }
                      const v = selections[p.id];
                      if (v?.startsWith('place:')) {
                        usedByOthers.add(parseInt(v.slice(6), 10));
                      }
                    }

                    const previewPoints =
                      outcome && pointsFromOutcome(outcome, maxPlace);

                    return (
                      <div
                        key={player.id}
                        className="flex flex-wrap items-center gap-2 sm:gap-3 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 [@media(orientation:landscape)_and_(max-height:500px)]:py-1.5 [@media(orientation:landscape)_and_(max-height:500px)]:px-2"
                      >
                        <Icon className={`w-5 h-5 shrink-0 ${color}`} />
                        <span className="text-white flex-1 min-w-[100px] text-sm [@media(orientation:landscape)_and_(max-height:500px)]:text-xs">
                          {player.name}
                        </span>
                        <Select
                          value={value || undefined}
                          onValueChange={(v) => handleChange(player.id, v)}
                        >
                          <SelectTrigger className="w-[min(100vw-8rem,200px)] sm:w-[200px] bg-slate-700 border-slate-600 text-white text-sm">
                            <SelectValue placeholder="Resultado" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {placeOptions.map((pos) => {
                              const taken =
                                usedByOthers.has(pos) &&
                                value !== `place:${pos}`;
                              return (
                                <SelectItem
                                  key={pos}
                                  value={`place:${pos}`}
                                  disabled={taken}
                                  className="text-white hover:bg-slate-700"
                                >
                                  {outcomeLabel({
                                    type: 'place',
                                    place: pos as 1 | 2 | 3 | 4,
                                  })}{' '}
                                  ({POINTS_MAP[pos] ?? 0} pts)
                                </SelectItem>
                              );
                            })}
                            <SelectItem
                              value="tie"
                              className="text-white hover:bg-slate-700"
                            >
                              Empate (1 pt)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {previewPoints !== undefined && (
                          <span className="text-yellow-400 font-bold text-sm tabular-nums w-12 text-right">
                            {previewPoints} pts
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={handleSaveResults}
          className="w-full mt-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 [@media(orientation:landscape)_and_(max-height:500px)]:mt-2 [@media(orientation:landscape)_and_(max-height:500px)]:h-9"
          disabled={draftResults === null || !hasUnsavedChanges}
        >
          <Check className="w-4 h-4 mr-2" />
          Salvar resultados
        </Button>
      </CardContent>
    </Card>
  );
}
