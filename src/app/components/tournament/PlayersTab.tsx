import { pairKey } from '../../utils/roundGenerator';
import type { TournamentModality } from '../../constants/tournamentModality';
import { Player } from '../../types/tournament';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { User, Users } from 'lucide-react';

interface PlayersTabProps {
  players: Player[];
  modality: TournamentModality;
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

export default function PlayersTab({ players, modality }: PlayersTabProps) {
  const doubles = modality === 'doubles_cmd';

  return (
    <Card className="bg-slate-900/50 border-purple-900/50 backdrop-blur">
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
                <ul className="space-y-2">
                  {pair.map((p) => (
                    <li key={p.id} className="text-white">
                      {p.name}
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                  {index + 1}
                </div>
                <span className="text-white">{player.name}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
