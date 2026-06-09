import { useMemo } from 'react';
import { pairKey } from '../../utils/roundGenerator';
import { canModifyTournamentRoster } from '../../utils/lateJoinPlayer';
import type { TournamentModality } from '../../constants/tournamentModality';
import type { PlayerProfile } from '../../types/player';
import { Player, Tournament } from '../../types/tournament';
import PlayerPickerSection from '../PlayerPickerSection';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { User, Users, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';

interface PlayersTabProps {
  tournament: Tournament;
  modality: TournamentModality;
  onAddPlayer: (tournamentId: string, profile: PlayerProfile) => Promise<void>;
  onRemovePlayer: (tournamentId: string, entryId: string) => Promise<void>;
}

function PlayerLine({ player }: { player: Player }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-white">{player.name}</p>
      {player.fullName && (
        <p className="text-xs text-slate-500">{player.fullName}</p>
      )}
      {player.companionNick && (
        <p className="text-xs text-slate-600">@{player.companionNick}</p>
      )}
    </div>
  );
}

function doublesPairs(players: Player[]): Player[][] {
  const out: Player[][] = [];
  const seen = new Set<string>();
  for (const p of players) {
    if (!p.partnerId) {
      continue;
    }
    const k = pairKey(p.id, p.partnerId);
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    const buddy = players.find((x) => x.id === p.partnerId);
    out.push(buddy ? [p, buddy] : [p]);
  }
  return out;
}

export default function PlayersTab({
  tournament,
  modality,
  onAddPlayer,
  onRemovePlayer,
}: PlayersTabProps) {
  const doubles = modality === 'doubles_cmd';
  const players = tournament.players;

  const rosterGuard = useMemo(
    () => canModifyTournamentRoster(tournament),
    [tournament]
  );

  const excludedPlayerIds = useMemo(
    () => new Set(players.map((p) => p.playerId)),
    [players]
  );

  const handleAddFromProfile = async (profile: PlayerProfile) => {
    try {
      await onAddPlayer(tournament.id, profile);
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
      toast.success(`${name} removido do campeonato.`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Não foi possível remover o jogador.'
      );
    }
  };

  return (
    <div className="space-y-6">
      {!doubles && (
        <Card className="relative z-20 bg-slate-900/50 border-purple-900/50 backdrop-blur overflow-visible">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-400" />
              Adicionar Jogador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PlayerPickerSection
              excludedPlayerIds={excludedPlayerIds}
              onAddFromProfile={handleAddFromProfile}
              disabled={!rosterGuard.ok}
              disabledReason={rosterGuard.ok ? undefined : rosterGuard.reason}
              description={
                tournament.rounds.length === 0
                  ? 'Monte o elenco aqui. Depois vá à aba Rodadas e clique em Gerar Mesas (apenas uma vez).'
                  : 'Adicione ou remova jogadores entre rodadas. As mesas são ajustadas automaticamente (mínimo 3, máximo 4 por mesa).'
              }
            />
          </CardContent>
        </Card>
      )}

      <Card className="relative z-0 bg-slate-900/50 border-purple-900/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            {doubles ? (
              <Users className="w-5 h-5 text-blue-400" />
            ) : (
              <User className="w-5 h-5 text-blue-400" />
            )}
            {doubles ? 'Duplas' : 'Lista de Jogadores'} ({players.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {doubles ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doublesPairs(players).map((pair, i) => (
                <div
                  key={pair.map((p) => p.id).join('-')}
                  className="rounded-lg border border-purple-800/50 bg-slate-800/40 p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-purple-400 mb-3">
                    Dupla {i + 1}
                  </p>
                  <ul className="space-y-3">
                    {pair.map((p) => (
                      <li key={p.id}>
                        <PlayerLine player={p} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 [@media(orientation:landscape)_and_(max-height:500px)]:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-3 [@media(orientation:landscape)_and_(max-height:500px)]:gap-2 sm:gap-4">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 flex items-center gap-3 hover:bg-slate-800/70 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold shrink-0">
                    {index + 1}
                  </div>
                  <PlayerLine player={player} />
                  {rosterGuard.ok && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleRemovePlayer(player.id, player.name)
                      }
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/30 shrink-0"
                      aria-label={`Remover ${player.name}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
