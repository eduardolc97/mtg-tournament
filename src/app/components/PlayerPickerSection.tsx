import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PlayerProfile } from '../types/player';
import { matchesPlayerSearch, nicknameKey } from '../types/player';
import { fetchPlayers, upsertPlayer } from '../lib/playersApi';
import PlayerProfileDialog from './PlayerProfileDialog';
import { PlayerProfileSummary } from './PlayerProfileSummary';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface PlayerPickerSectionProps {
  excludedPlayerIds: Set<string>;
  onAddFromProfile: (profile: PlayerProfile) => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
  description?: string;
}

export default function PlayerPickerSection({
  excludedPlayerIds,
  onAddFromProfile,
  disabled = false,
  disabledReason,
  description = 'Ao digitar, aparecem jogadores já cadastrados — clique para adicionar. Nomes novos abrem o cadastro com nome completo obrigatório.',
}: PlayerPickerSectionProps) {
  const [registry, setRegistry] = useState<PlayerProfile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSaving, setDialogSaving] = useState(false);
  const [pendingNickname, setPendingNickname] = useState('');
  const [pendingExisting, setPendingExisting] = useState<PlayerProfile | null>(
    null
  );
  const [requireFullName, setRequireFullName] = useState(false);
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
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRegistry([]);
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
    forceFullName: boolean
  ) => {
    setSuggestOpen(false);
    setPendingNickname(nickname);
    setPendingExisting(existing);
    setRequireFullName(forceFullName);
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

    const key = nicknameKey(trimmed);
    const existing =
      registry.find((p) => nicknameKey(p.nickname) === key) ?? null;

    if (existing) {
      if (!existing.fullName?.trim()) {
        openPlayerDialog(trimmed, existing, true);
        return;
      }
      openPlayerDialog(trimmed, existing, false);
      return;
    }

    openPlayerDialog(trimmed, null, true);
  };

  const handleDialogConfirm = async (data: {
    nickname: string;
    fullName: string;
    companionNick: string;
  }) => {
    setDialogSaving(true);
    try {
      const profile = await upsertPlayer({
        nickname: data.nickname,
        fullName: data.fullName,
        companionNick: data.companionNick || null,
      });

      setRegistry((prev) => {
        const key = nicknameKey(profile.nickname);
        const without = prev.filter((p) => nicknameKey(p.nickname) !== key);
        return [...without, profile].sort((a, b) =>
          a.nickname.localeCompare(b.nickname, 'pt-BR')
        );
      });

      await onAddFromProfile(profile);
      setPlayerName('');
      setSuggestOpen(false);
      setRequireFullName(false);
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
    beginAddPlayer(profile.nickname);
  };

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
      />

      <p className="text-sm text-slate-400 mb-3">{description}</p>

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
              if (registry.length > 0) {
                setSuggestOpen(true);
              }
            }}
            onFocus={() => {
              if (registry.length > 0 && !disabled) {
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
                    <button
                      key={profile.id}
                      type="button"
                      role="option"
                      className="flex w-full flex-col items-start gap-1 bg-slate-950 px-3 py-2.5 text-left hover:bg-purple-600/35"
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
    </>
  );
}
