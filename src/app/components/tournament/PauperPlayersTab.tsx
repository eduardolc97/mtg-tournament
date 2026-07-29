import { useCallback, useMemo, useState } from 'react';
import type { PlayerProfile } from '../../types/player';
import type { Tournament } from '../../types/tournament';
import {
  DEFAULT_PAUPER_RECORD,
  normalizePauperRecord,
  type PauperRecord,
} from '../../utils/pauperScoring';
import PlayerPickerSection from '../PlayerPickerSection';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { UserPlus, X, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import PauperRecordFields from './PauperRecordFields';

interface PauperPlayersTabProps {
  tournament: Tournament;
  onAddPlayer: (
    tournamentId: string,
    profile: PlayerProfile,
    pauperRecord?: PauperRecord
  ) => Promise<void>;
  onRemovePlayer: (tournamentId: string, entryId: string) => Promise<void>;
  onUpdateAllRecords: (
    tournamentId: string,
    updates: Array<{ entryId: string; record: PauperRecord }>
  ) => Promise<void>;
}

function recordsEqual(a: PauperRecord, b: PauperRecord): boolean {
  const na = normalizePauperRecord(a);
  const nb = normalizePauperRecord(b);
  return (
    na.wins === nb.wins &&
    na.losses === nb.losses &&
    na.draws === nb.draws &&
    na.performancePct === nb.performancePct
  );
}

function recordResetKey(record: PauperRecord): string {
  const n = normalizePauperRecord(record);
  return `${n.wins}-${n.losses}-${n.draws}-${n.performancePct ?? 'x'}`;
}

export default function PauperPlayersTab({
  tournament,
  onAddPlayer,
  onRemovePlayer,
  onUpdateAllRecords,
}: PauperPlayersTabProps) {
  const [savingAll, setSavingAll] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, PauperRecord>>({});
  const [savedVersion, setSavedVersion] = useState(0);

  const excludedPlayerIds = useMemo(
    () => new Set(tournament.players.map((p) => p.playerId)),
    [tournament.players]
  );

  const pointsDoubled = tournament.pointsDoubled === true;

  const getDraft = useCallback(
    (player: Tournament['players'][number]): PauperRecord => {
      return (
        drafts[player.id] ??
        normalizePauperRecord(player.pauperRecord ?? DEFAULT_PAUPER_RECORD)
      );
    },
    [drafts]
  );

  const dirtyUpdates = useMemo(() => {
    return tournament.players
      .map((player) => {
        const draft = getDraft(player);
        const saved = normalizePauperRecord(
          player.pauperRecord ?? DEFAULT_PAUPER_RECORD
        );
        if (recordsEqual(draft, saved)) {
          return null;
        }
        return { entryId: player.id, record: draft };
      })
      .filter((u): u is { entryId: string; record: PauperRecord } => u !== null);
  }, [tournament.players, getDraft]);

  const handleAddFromProfile = async (
    profile: PlayerProfile,
    pauperRecord?: PauperRecord
  ) => {
    try {
      await onAddPlayer(
        tournament.id,
        profile,
        normalizePauperRecord(pauperRecord ?? DEFAULT_PAUPER_RECORD)
      );
      toast.success(`${profile.nickname} adicionado ao campeonato!`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Não foi possível adicionar o jogador.'
      );
      throw e;
    }
  };

  const handleRemovePlayer = async (entryId: string, name: string) => {
    try {
      await onRemovePlayer(tournament.id, entryId);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[entryId];
        return next;
      });
      toast.success(`${name} removido do campeonato.`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Não foi possível remover o jogador.'
      );
    }
  };

  const handleSaveAll = async () => {
    if (dirtyUpdates.length === 0) {
      return;
    }
    setSavingAll(true);
    try {
      await onUpdateAllRecords(tournament.id, dirtyUpdates);
      setDrafts({});
      setSavedVersion((v) => v + 1);
      toast.success(
        dirtyUpdates.length === 1
          ? 'Resultado salvo.'
          : `${dirtyUpdates.length} resultados salvos.`
      );
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Não foi possível salvar os resultados.'
      );
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="relative z-20 bg-slate-900/50 border-purple-900/50 backdrop-blur overflow-visible">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-400" />
            Adicionar jogador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PlayerPickerSection
            excludedPlayerIds={excludedPlayerIds}
            onAddFromProfile={handleAddFromProfile}
            showPauperFields
            pointsDoubled={pointsDoubled}
          />
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-purple-900/50 backdrop-blur">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-white">
              Resultados ({tournament.players.length})
            </CardTitle>
            {tournament.players.length > 0 && (
              <Button
                size="sm"
                disabled={dirtyUpdates.length === 0 || savingAll}
                onClick={handleSaveAll}
                className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40"
              >
                {savingAll ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar resultados
                {dirtyUpdates.length > 0 && !savingAll && (
                  <span className="ml-1.5 text-purple-200/80">
                    ({dirtyUpdates.length})
                  </span>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {tournament.players.length === 0 ? (
            <p className="text-center py-8 text-slate-500">
              Nenhum jogador adicionado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {tournament.players.map((player) => {
                const draft = getDraft(player);
                const saved = normalizePauperRecord(
                  player.pauperRecord ?? DEFAULT_PAUPER_RECORD
                );
                const isDirty = !recordsEqual(draft, saved);

                return (
                  <div
                    key={player.id}
                    className={`rounded-lg border p-3 sm:p-4 ${
                      isDirty
                        ? 'border-purple-600/50 bg-purple-950/20'
                        : 'border-slate-700 bg-slate-800/40'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium">{player.name}</p>
                        {player.fullName && (
                          <p className="text-xs text-slate-500">{player.fullName}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={savingAll}
                        onClick={() => handleRemovePlayer(player.id, player.name)}
                        className="self-start text-red-400 hover:text-red-300 hover:bg-red-950/30 shrink-0"
                        aria-label={`Remover ${player.name}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="mt-3">
                      <PauperRecordFields
                        key={`${player.id}-${recordResetKey(saved)}-${savedVersion}`}
                        record={draft}
                        pointsDoubled={pointsDoubled}
                        onChange={(record) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [player.id]: record,
                          }))
                        }
                        disabled={savingAll}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
