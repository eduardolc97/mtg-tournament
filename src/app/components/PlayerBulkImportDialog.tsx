import { useEffect, useMemo, useState } from 'react';
import type { PlayerProfile } from '../types/player';
import type { PlayerNameImportLine } from '../utils/playerNameImport';
import { playerIdentityKeys, playerNameMatchKey } from '../types/player';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

export type PlayerBulkImportDecision =
  | { type: 'player'; profileId: string; fullName: string }
  | { type: 'create'; fullName: string; companionNick: string }
  | { type: 'skip' }
  | { type: 'unresolved' };

export interface PlayerBulkImportItem {
  line: PlayerNameImportLine;
  decision: PlayerBulkImportDecision;
}

interface PlayerBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: PlayerNameImportLine[];
  players: PlayerProfile[];
  saving?: boolean;
  onConfirm: (items: PlayerBulkImportItem[]) => Promise<void>;
}

function initialDecision(line: PlayerNameImportLine): PlayerBulkImportDecision {
  if (line.status === 'recognized' && line.matches.length === 1) {
    return {
      type: 'player',
      profileId: line.matches[0].id,
      fullName: line.matches[0].fullName ?? '',
    };
  }
  if (line.status === 'new_player') {
    return { type: 'create', fullName: '', companionNick: '' };
  }
  if (line.status === 'duplicate_line') {
    return { type: 'skip' };
  }
  return { type: 'unresolved' };
}

function lineStatusLabel(status: PlayerNameImportLine['status']): string {
  switch (status) {
    case 'recognized':
      return 'Reconhecido';
    case 'possible_match':
      return 'Possível correspondência';
    case 'new_player':
      return 'Novo jogador';
    case 'duplicate_line':
      return 'Linha duplicada';
    case 'ambiguous_match':
      return 'Correspondência ambígua';
  }
}

export default function PlayerBulkImportDialog({
  open,
  onOpenChange,
  lines,
  players,
  saving = false,
  onConfirm,
}: PlayerBulkImportDialogProps) {
  const [decisions, setDecisions] = useState<
    Record<number, PlayerBulkImportDecision>
  >({});

  useEffect(() => {
    if (!open) {
      return;
    }
    setDecisions(
      Object.fromEntries(lines.map((line) => [line.id, initialDecision(line)]))
    );
  }, [open, lines]);

  const items = useMemo<PlayerBulkImportItem[]>(
    () =>
      lines.map((line) => ({
        line,
        decision: decisions[line.id] ?? initialDecision(line),
      })),
    [lines, decisions]
  );

  const aliasConflicts = useMemo(() => {
    return items.flatMap(({ line, decision }) => {
      if (decision.type !== 'player' && decision.type !== 'create') {
        return [];
      }
      const owner = players.find(
        (profile) =>
          (decision.type === 'create' || profile.id !== decision.profileId) &&
          playerIdentityKeys(profile).has(playerNameMatchKey(line.name))
      );
      return owner ? [{ lineId: line.id, owner }] : [];
    });
  }, [items, players]);

  const unresolved = items.some(({ decision }) => {
    if (decision.type === 'unresolved') {
      return true;
    }
    if (decision.type === 'create') {
      return !decision.fullName.trim();
    }
    if (decision.type === 'player') {
      const profile = players.find((item) => item.id === decision.profileId);
      return !profile || (!profile.fullName?.trim() && !decision.fullName.trim());
    }
    return false;
  });
  const hasAction = items.some(
    ({ decision }) => decision.type === 'player' || decision.type === 'create'
  );

  const setDecision = (
    lineId: number,
    decision: PlayerBulkImportDecision
  ) => {
    setDecisions((previous) => ({ ...previous, [lineId]: decision }));
  };

  const handleSelection = (lineId: number, value: string) => {
    if (value === 'create') {
      setDecision(lineId, { type: 'create', fullName: '', companionNick: '' });
    } else if (value === 'skip') {
      setDecision(lineId, { type: 'skip' });
    } else if (value.startsWith('player:')) {
      const profileId = value.slice('player:'.length);
      const profile = players.find((item) => item.id === profileId);
      setDecision(lineId, {
        type: 'player',
        profileId,
        fullName: profile?.fullName ?? '',
      });
    } else {
      setDecision(lineId, { type: 'unresolved' });
    }
  };

  const handleConfirm = async () => {
    if (unresolved || aliasConflicts.length > 0 || !hasAction || saving) {
      return;
    }
    await onConfirm(items);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto bg-slate-900 border-slate-700 text-white sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Revisar jogadores importados</DialogTitle>
          <DialogDescription className="text-slate-400">
            Nada será adicionado até você confirmar. Nomes associados a jogadores
            existentes serão salvos como aliases nessa confirmação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {items.map(({ line, decision }) => {
            const duplicateName =
              line.duplicateOf === undefined
                ? null
                : lines[line.duplicateOf]?.name;
            const conflict = aliasConflicts.find(
              (item) => item.lineId === line.id
            );
            const selectionValue =
              decision.type === 'player'
                ? `player:${decision.profileId}`
                : decision.type === 'create'
                  ? 'create'
                  : decision.type === 'skip'
                    ? 'skip'
                    : '';

            return (
              <section
                key={`${line.id}-${line.name}`}
                className="space-y-3 rounded-lg border border-slate-700 bg-slate-800/40 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 break-words text-sm font-medium text-white">
                    {line.name}
                  </p>
                  <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-300">
                    {lineStatusLabel(line.status)}
                  </span>
                </div>

                {line.status === 'duplicate_line' ? (
                  <p className="text-xs text-slate-400">
                    Linha repetida de “{duplicateName ?? 'linha anterior'}”; será ignorada.
                  </p>
                ) : (
                  <select
                    aria-label={`Jogador correspondente para ${line.name}`}
                    value={selectionValue}
                    disabled={saving}
                    onChange={(event) =>
                      handleSelection(line.id, event.target.value)
                    }
                    className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Escolha um jogador…</option>
                    {line.matches.length > 0 && (
                      <optgroup label="Correspondências sugeridas">
                        {line.matches.map((profile) => (
                          <option key={profile.id} value={`player:${profile.id}`}>
                            {profile.nickname}
                            {profile.fullName ? ` — ${profile.fullName}` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {line.status !== 'recognized' && (
                      <optgroup label="Todos os jogadores cadastrados">
                        {players
                          .filter(
                            (profile) =>
                              !line.matches.some(
                                (match) => match.id === profile.id
                              )
                          )
                          .map((profile) => (
                            <option
                              key={profile.id}
                              value={`player:${profile.id}`}
                            >
                              {profile.nickname}
                              {profile.fullName ? ` — ${profile.fullName}` : ''}
                            </option>
                          ))}
                      </optgroup>
                    )}
                    {line.status !== 'recognized' && (
                      <option value="create">Criar novo jogador</option>
                    )}
                    <option value="skip">Ignorar esta linha</option>
                  </select>
                )}

                {decision.type === 'create' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label
                        htmlFor={`bulk-full-name-${line.id}`}
                        className="text-xs text-slate-400"
                      >
                        Nome completo *
                      </label>
                      <Input
                        id={`bulk-full-name-${line.id}`}
                        value={decision.fullName}
                        disabled={saving}
                        onChange={(event) =>
                          setDecision(line.id, {
                            ...decision,
                            fullName: event.target.value,
                          })
                        }
                        autoComplete="name"
                        className="bg-slate-950 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor={`bulk-companion-nick-${line.id}`}
                        className="text-xs text-slate-400"
                      >
                        Nick do Companion (opcional)
                      </label>
                      <Input
                        id={`bulk-companion-nick-${line.id}`}
                        value={decision.companionNick}
                        disabled={saving}
                        onChange={(event) =>
                          setDecision(line.id, {
                            ...decision,
                            companionNick: event.target.value,
                          })
                        }
                        autoComplete="off"
                        className="bg-slate-950 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                )}

                {decision.type === 'player' &&
                  !players.find((profile) => profile.id === decision.profileId)
                    ?.fullName?.trim() && (
                    <div className="space-y-1">
                      <label
                        htmlFor={`bulk-existing-full-name-${line.id}`}
                        className="text-xs text-slate-400"
                      >
                        Nome completo obrigatório para este cadastro
                      </label>
                      <Input
                        id={`bulk-existing-full-name-${line.id}`}
                        value={decision.fullName}
                        disabled={saving}
                        onChange={(event) =>
                          setDecision(line.id, {
                            ...decision,
                            fullName: event.target.value,
                          })
                        }
                        autoComplete="name"
                        className="bg-slate-950 border-slate-600 text-white"
                      />
                    </div>
                  )}

                {conflict && (
                  <p className="text-sm text-red-300" role="alert">
                    Conflito: este nome já está associado a{' '}
                    {conflict.owner.nickname}.
                    Resolva a identidade antes de importar.
                  </p>
                )}
              </section>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="text-slate-300 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={
              saving || unresolved || aliasConflicts.length > 0 || !hasAction
            }
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? 'Adicionando…' : 'Confirmar e adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
