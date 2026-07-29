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
import { UserPlus, X, Loader2 } from 'lucide-react';
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
  onUpdateRecord: (
    tournamentId: string,
    entryId: string,
    record: PauperRecord
  ) => Promise<void>;
}

function recordResetKey(record: PauperRecord): string {
  const n = normalizePauperRecord(record);
  return `${n.wins}-${n.losses}-${n.draws}-${n.performancePct ?? 'x'}`;
}

export default function PauperPlayersTab({
  tournament,
  onAddPlayer,
  onRemovePlayer,
  onUpdateRecord,
}: PauperPlayersTabProps) {
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, PauperRecord>>({});

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

  const handleSaveRecord = async (entryId: string, record: PauperRecord) => {
    setSavingEntryId(entryId);
    try {
      const normalized = normalizePauperRecord(record);
      await onUpdateRecord(tournament.id, entryId, normalized);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[entryId];
        return next;
      });
      toast.success('Resultado salvo.');
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Não foi possível salvar o resultado.'
      );
    } finally {
      setSavingEntryId(null);
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
          <CardTitle className="text-white">
            Resultados ({tournament.players.length})
          </CardTitle>
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
                const isDirty =
                  draft.wins !== saved.wins ||
                  draft.losses !== saved.losses ||
                  draft.draws !== saved.draws ||
                  draft.performancePct !== saved.performancePct;
                const isSaving = savingEntryId === player.id;

                return (
                  <div
                    key={player.id}
                    className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 sm:p-4"
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
                        onClick={() => handleRemovePlayer(player.id, player.name)}
                        className="self-start text-red-400 hover:text-red-300 hover:bg-red-950/30 shrink-0"
                        aria-label={`Remover ${player.name}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <PauperRecordFields
                        key={`${player.id}-${recordResetKey(saved)}`}
                        record={draft}
                        pointsDoubled={pointsDoubled}
                        onChange={(record) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [player.id]: record,
                          }))
                        }
                        disabled={isSaving}
                      />
                      <Button
                        size="sm"
                        disabled={!isDirty || isSaving}
                        onClick={() => handleSaveRecord(player.id, draft)}
                        className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Salvar'
                        )}
                      </Button>
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
