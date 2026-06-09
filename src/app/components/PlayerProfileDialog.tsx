import { useEffect, useState } from 'react';
import type { PlayerProfile } from '../types/player';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

export interface PlayerProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialNickname: string;
  existing?: PlayerProfile | null;
  requireFullName: boolean;
  onConfirm: (data: {
    nickname: string;
    fullName: string;
    companionNick: string;
  }) => void | Promise<void>;
  saving?: boolean;
}

export default function PlayerProfileDialog({
  open,
  onOpenChange,
  initialNickname,
  existing,
  requireFullName,
  onConfirm,
  saving = false,
}: PlayerProfileDialogProps) {
  const [nickname, setNickname] = useState(initialNickname);
  const [fullName, setFullName] = useState('');
  const [companionNick, setCompanionNick] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }
    setNickname(existing?.nickname ?? initialNickname);
    setFullName(existing?.fullName ?? '');
    setCompanionNick(existing?.companionNick ?? '');
  }, [open, initialNickname, existing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm({
      nickname: nickname.trim(),
      fullName: fullName.trim(),
      companionNick: companionNick.trim(),
    });
  };

  const title = existing
    ? requireFullName
      ? 'Complete o cadastro do jogador'
      : 'Editar jogador'
    : 'Novo jogador';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-slate-900 border-slate-700 text-white sm:max-w-md"
        onPointerDownOutside={(e) => {
          if (requireFullName) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (requireFullName) {
            e.preventDefault();
          }
        }}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {requireFullName
                ? 'O nome completo é obrigatório para identificar o jogador na liga mensal.'
                : 'Você pode atualizar os dados antes de adicionar ao torneio.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="player-nickname" className="text-slate-300">
                Apelido
              </Label>
              <Input
                id="player-nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={!!existing}
                className="bg-slate-800/50 border-slate-700 text-white"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="player-full-name" className="text-slate-300">
                Nome completo *
              </Label>
              <Input
                id="player-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-slate-800/50 border-slate-700 text-white"
                autoComplete="name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="player-companion-nick" className="text-slate-300">
                Nick MTG Companion
              </Label>
              <Input
                id="player-companion-nick"
                value={companionNick}
                onChange={(e) => setCompanionNick(e.target.value)}
                placeholder="Opcional"
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="text-slate-300 hover:text-white"
            >
              {requireFullName ? 'Voltar' : 'Cancelar'}
            </Button>
            <Button
              type="submit"
              disabled={saving || !fullName.trim() || !nickname.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Salvando…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
