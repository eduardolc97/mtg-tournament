import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PlayerProfile } from '../types/player';
import {
  DEFAULT_PAUPER_RECORD,
  type PauperRecord,
} from '../utils/pauperScoring';
import {
  matchesPlayerSearch,
  nicknameKey,
  playerIdentityKeys,
  playerNameMatchKey,
} from '../types/player';
import {
  fetchPlayers,
  savePlayerAlias,
  updatePlayerProfile,
  upsertPlayer,
} from '../lib/playersApi';
import {
  classifyPlayerNameLines,
  type PlayerNameImportLine,
} from '../utils/playerNameImport';
import PlayerProfileDialog from './PlayerProfileDialog';
import PlayerBulkImportDialog, {
  type PlayerBulkImportItem,
} from './PlayerBulkImportDialog';
import { PlayerProfileSummary } from './PlayerProfileSummary';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Pencil, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface PlayerPickerSectionProps {
  excludedPlayerIds: Set<string>;
  onAddFromProfile: (
    profile: PlayerProfile,
    pauperRecord?: PauperRecord
  ) => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
  description?: string;
  showPauperFields?: boolean;
  pointsDoubled?: boolean;
}

export default function PlayerPickerSection({
  excludedPlayerIds,
  onAddFromProfile,
  disabled = false,
  disabledReason,
  description = 'Ao digitar, aparecem jogadores já cadastrados — clique para adicionar. Nomes novos abrem o cadastro com nome completo obrigatório.',
  showPauperFields = false,
  pointsDoubled = false,
}: PlayerPickerSectionProps) {
  const [registry, setRegistry] = useState<PlayerProfile[]>([]);
  const [registryLoading, setRegistryLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSaving, setDialogSaving] = useState(false);
  const [pendingNickname, setPendingNickname] = useState('');
  const [pendingExisting, setPendingExisting] = useState<PlayerProfile | null>(
    null
  );
  const [editOnly, setEditOnly] = useState(false);
  const [requireFullName, setRequireFullName] = useState(false);
  const [bulkNames, setBulkNames] = useState('');
  const [bulkLines, setBulkLines] = useState<PlayerNameImportLine[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const suggestContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateDropdownPosition = useCallback(() => {
    const el = suggestContainerRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    setDropdownStyle({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchPlayers()
      .then((players) => {
        if (!cancelled) {
          setRegistry(players);
          setRegistryLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRegistry([]);
          setRegistryLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!suggestOpen) {
      setDropdownStyle(null);
      return;
    }
    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [suggestOpen, updateDropdownPosition]);

  useEffect(() => {
    if (!suggestOpen) {
      return;
    }
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const container = suggestContainerRef.current;
      const dropdown = dropdownRef.current;
      if (container?.contains(target) || dropdown?.contains(target)) {
        return;
      }
      setSuggestOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [suggestOpen]);

  const availableRegistryCount = useMemo(() => {
    return registry.filter((p) => !excludedPlayerIds.has(p.id)).length;
  }, [registry, excludedPlayerIds]);

  const suggestions = useMemo(() => {
    const available = registry.filter((p) => !excludedPlayerIds.has(p.id));
    const q = playerName.trim();
    if (!q) {
      return available.slice(0, 50);
    }
    return available.filter((p) => matchesPlayerSearch(p, q)).slice(0, 50);
  }, [registry, excludedPlayerIds, playerName]);

  const openPlayerDialog = (
    nickname: string,
    existing: PlayerProfile | null,
    forceFullName: boolean,
    editExistingOnly = false
  ) => {
    setSuggestOpen(false);
    setPendingNickname(nickname);
    setPendingExisting(existing);
    setRequireFullName(forceFullName);
    setEditOnly(editExistingOnly);
    setDialogOpen(true);
  };

  const beginAddPlayer = (rawNickname: string) => {
    if (disabled) {
      if (disabledReason) {
        toast.error(disabledReason);
      }
      return;
    }

    const trimmed = rawNickname.trim();
    if (!trimmed) {
      toast.error('Digite o apelido do jogador');
      return;
    }

    const matchKey = playerNameMatchKey(trimmed);
    const matches = registry.filter((profile) =>
      playerIdentityKeys(profile).has(matchKey)
    );

    if (matches.length > 1) {
      toast.error('Mais de um jogador corresponde a esse nome. Escolha na lista.');
      return;
    }

    if (matches.length === 1) {
      void addExistingPlayer(matches[0]);
      return;
    }

    openPlayerDialog(trimmed, null, true);
  };

  const addExistingPlayer = async (profile: PlayerProfile) => {
    if (showPauperFields) {
      openPlayerDialog(profile.nickname, profile, !profile.fullName?.trim());
      return;
    }
    setSuggestOpen(false);
    try {
      await onAddFromProfile(
        profile,
        showPauperFields ? DEFAULT_PAUPER_RECORD : undefined
      );
      setPlayerName('');
    } catch {
      // The owning page reports errors from the add callback.
    }
  };

  const handleDialogConfirm = async (data: {
    nickname: string;
    fullName: string;
    companionNick: string;
    pauperRecord?: PauperRecord;
  }) => {
    setDialogSaving(true);
    try {
      const profile = pendingExisting
        ? await updatePlayerProfile(pendingExisting.id, {
            nickname: data.nickname,
            fullName: data.fullName,
            companionNick: data.companionNick || null,
          })
        : await upsertPlayer({
            nickname: data.nickname,
            fullName: data.fullName,
            companionNick: data.companionNick || null,
          });

      setRegistry((prev) => {
        const key = nicknameKey(profile.nickname);
        const without = prev.filter(
          (p) => p.id !== profile.id && nicknameKey(p.nickname) !== key
        );
        return [...without, profile].sort((a, b) =>
          a.nickname.localeCompare(b.nickname, 'pt-BR')
        );
      });

      if (!pendingExisting || !editOnly) {
        await onAddFromProfile(profile, data.pauperRecord);
      }
      setPlayerName('');
      setSuggestOpen(false);
      setRequireFullName(false);
      setEditOnly(false);
      setDialogOpen(false);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Não foi possível salvar o jogador.'
      );
    } finally {
      setDialogSaving(false);
    }
  };

  const handleAddPlayer = () => {
    beginAddPlayer(playerName);
  };

  const applySuggestedPlayer = (profile: PlayerProfile) => {
    void addExistingPlayer(profile);
  };

  const editSuggestedPlayer = (profile: PlayerProfile) => {
    openPlayerDialog(profile.nickname, profile, false, true);
  };

  const openBulkReview = () => {
    const lines = classifyPlayerNameLines(bulkNames, registry);
    if (lines.length === 0) {
      toast.error('Cole pelo menos um nome para revisar.');
      return;
    }
    setBulkLines(lines);
    setBulkDialogOpen(true);
  };

  const confirmBulkImport = async (items: PlayerBulkImportItem[]) => {
    setBulkSaving(true);
    try {
      const profilesToAdd = new Map<string, PlayerProfile>();
      const aliasesByProfile = new Map<string, string[]>();

      for (const { line, decision } of items) {
        if (decision.type === 'skip' || decision.type === 'unresolved') {
          continue;
        }

        if (decision.type === 'player') {
          const existing = registry.find(
            (profile) => profile.id === decision.profileId
          );
          if (!existing) {
            throw new Error(
              `O jogador associado a “${line.name}” não está mais disponível. Atualize a página e tente novamente.`
            );
          }
          const profile = existing.fullName?.trim()
            ? existing
            : await updatePlayerProfile(existing.id, {
                nickname: existing.nickname,
                fullName: decision.fullName,
                companionNick: existing.companionNick,
              });
          await savePlayerAlias(profile.id, line.name);
          profilesToAdd.set(profile.id, profile);
          const aliases = aliasesByProfile.get(profile.id) ?? [];
          aliases.push(line.name.trim());
          aliasesByProfile.set(profile.id, aliases);
          continue;
        }

        const profile = await upsertPlayer({
          nickname: line.name,
          fullName: decision.fullName,
          companionNick: decision.companionNick || null,
        });
        profilesToAdd.set(profile.id, profile);
      }

      const addedPlayerIds = new Set(excludedPlayerIds);
      for (const profile of profilesToAdd.values()) {
        if (addedPlayerIds.has(profile.id)) {
          continue;
        }
        await onAddFromProfile(
          profile,
          showPauperFields ? DEFAULT_PAUPER_RECORD : undefined
        );
        addedPlayerIds.add(profile.id);
      }

      setRegistry((previous) => {
        const updated = new Map(previous.map((profile) => [profile.id, profile]));
        for (const [profileId, profile] of profilesToAdd) {
          const aliases = new Map(
            (profile.aliases ?? []).map((alias) => [
              playerNameMatchKey(alias),
              alias,
            ])
          );
          for (const alias of aliasesByProfile.get(profileId) ?? []) {
            aliases.set(playerNameMatchKey(alias), alias);
          }
          updated.set(profileId, { ...profile, aliases: [...aliases.values()] });
        }
        return [...updated.values()].sort((a, b) =>
          a.nickname.localeCompare(b.nickname, 'pt-BR')
        );
      });

      setPlayerName('');
      setBulkNames('');
      setBulkDialogOpen(false);
      toast.success('Lista de jogadores importada.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível importar a lista de jogadores.'
      );
    } finally {
      setBulkSaving(false);
    }
  };

  const hasTournamentPlayers = excludedPlayerIds.size > 0;
  const useBulkNameImport = !showPauperFields && !hasTournamentPlayers;
  const pickerDescription = showPauperFields
    ? 'Digite o apelido ou escolha da lista — o popup abre para confirmar cadastro e resultado Pauper.'
    : useBulkNameImport
      ? 'Adicione jogadores pela busca ou cole uma lista para revisar antes de adicionar.'
      : description;

  return (
    <>
      <PlayerProfileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialNickname={pendingNickname}
        existing={pendingExisting}
        requireFullName={requireFullName}
        onConfirm={handleDialogConfirm}
        saving={dialogSaving}
        showPauperFields={showPauperFields}
        pointsDoubled={pointsDoubled}
        allowNicknameEdit={editOnly}
      />

      <PlayerBulkImportDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        lines={bulkLines}
        players={registry}
        saving={bulkSaving}
        onConfirm={confirmBulkImport}
      />

      <p className="text-sm text-slate-400 mb-3">{pickerDescription}</p>

      {disabled && disabledReason && (
        <p className="text-sm text-amber-400/90 mb-3 rounded-lg border border-amber-900/45 bg-amber-950/25 px-3 py-2">
          {disabledReason}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
          <div
            ref={suggestContainerRef}
            className="relative flex-1 min-w-0 w-full"
          >
            <Input
              placeholder="Apelido do jogador"
              value={playerName}
              disabled={disabled}
              onChange={(e) => {
                setPlayerName(e.target.value);
                if (!disabled) {
                  setSuggestOpen(true);
                }
              }}
              onFocus={() => {
                if (!disabled) {
                  setSuggestOpen(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddPlayer();
                }
                if (e.key === 'Escape') {
                  setSuggestOpen(false);
                }
              }}
              autoComplete="off"
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
            {suggestOpen &&
              !disabled &&
              registry.length > 0 &&
              dropdownStyle &&
              createPortal(
                <div
                  ref={dropdownRef}
                  style={{
                    top: dropdownStyle.top,
                    left: dropdownStyle.left,
                    width: dropdownStyle.width,
                  }}
                  className="fixed z-50 max-h-60 overflow-y-auto rounded-md border border-slate-600 bg-slate-950 py-1 shadow-2xl"
                  role="listbox"
                  aria-label="Jogadores cadastrados"
                >
                  <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Já cadastrados
                  </p>
                  {suggestions.length > 0 ? (
                    suggestions.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center gap-2 bg-slate-950 px-2 py-2 hover:bg-purple-600/20"
                      >
                        <button
                          type="button"
                          role="option"
                          aria-label={`Adicionar ${profile.nickname}`}
                          className="min-w-0 flex-1 rounded px-1 py-0.5 text-left"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applySuggestedPlayer(profile);
                          }}
                        >
                          <PlayerProfileSummary
                            nickname={profile.nickname}
                            fullName={profile.fullName}
                            companionNick={profile.companionNick}
                          />
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${profile.nickname}`}
                          title={`Editar ${profile.nickname}`}
                          className="h-8 w-8 shrink-0 text-slate-400 hover:bg-slate-800 hover:text-white"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation();
                            editSuggestedPlayer(profile);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="bg-slate-950 px-3 py-4 text-center text-sm text-slate-500">
                      {availableRegistryCount === 0
                        ? 'Todos os jogadores cadastrados já estão nesta lista. Digite um apelido novo.'
                        : 'Nenhum jogador combina com a busca. Use o texto digitado como apelido novo.'}
                    </p>
                  )}
                </div>,
                document.body
              )}
          </div>
          <Button
            onClick={handleAddPlayer}
            disabled={disabled}
            className="bg-blue-600 hover:bg-blue-700 shrink-0"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
      </div>

      {useBulkNameImport && (
        <div className="mt-6 space-y-3 border-t border-slate-700 pt-5">
          <label
            htmlFor="bulk-player-names"
            className="text-sm font-medium text-slate-300"
          >
            Cole os nomes dos jogadores, um por linha
          </label>
          <Textarea
            id="bulk-player-names"
            value={bulkNames}
            disabled={disabled || bulkSaving}
            onChange={(event) => setBulkNames(event.target.value)}
            placeholder={'Affonso Rotta\nCigarro Molhado\n🐺 João Victor'}
            className="min-h-36 resize-y bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
          />
          <Button
            type="button"
            variant="outline"
            onClick={openBulkReview}
            disabled={
              disabled || registryLoading || bulkSaving || !bulkNames.trim()
            }
            className="border-blue-500/50 text-blue-200 hover:bg-blue-950/40 hover:text-white"
          >
            {registryLoading ? 'Carregando jogadores…' : 'Revisar lista colada'}
          </Button>
        </div>
      )}
    </>
  );
}
