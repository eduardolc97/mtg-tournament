import { useState } from 'react';
import { normalizeTournamentModality } from '../../constants/tournamentModality';
import { Tournament } from '../../types/tournament';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Target, Circle, Maximize2 } from 'lucide-react';
import TableCard from './TableCard';
import RoundPresentationDialog from './RoundPresentationDialog';
import { isRoundFullyScored } from '../../utils/finalRound';

interface RoundsTabProps {
  tournament: Tournament;
}

export default function RoundsTab({ tournament }: RoundsTabProps) {
  const doubles =
    normalizeTournamentModality(tournament.modality) === 'doubles_cmd';
  const [presentationRoundId, setPresentationRoundId] = useState<string | null>(
    null
  );
  const presentationRound = presentationRoundId
    ? tournament.rounds.find((r) => r.id === presentationRoundId)
    : undefined;

  if (tournament.rounds.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-purple-900/50 backdrop-blur">
        <CardContent className="py-12 text-center">
          <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Nenhuma rodada gerada ainda.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {presentationRound && (
        <RoundPresentationDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setPresentationRoundId(null);
            }
          }}
          tournamentName={tournament.name}
          round={presentationRound}
          modality={tournament.modality}
        />
      )}
      {tournament.rounds.map((round) => {
        const allTablesCompleted = isRoundFullyScored(round);

        return (
          <div key={round.id}>
            <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4 sm:gap-3 [@media(orientation:landscape)_and_(max-height:500px)]:mb-2">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10 ${
                  allTablesCompleted
                    ? 'bg-green-600'
                    : 'bg-gradient-to-br from-purple-600 to-blue-600'
                }`}
              >
                <span className="text-sm font-bold text-white sm:text-base">
                  {round.number}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white sm:text-2xl [@media(orientation:landscape)_and_(max-height:500px)]:text-base">
                Rodada {round.number}
              </h2>
              {allTablesCompleted && (
                <Circle className="h-5 w-5 fill-green-400 text-green-400" />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto border-purple-500/50 text-purple-200 hover:bg-purple-950/50 hover:text-white"
                onClick={() => setPresentationRoundId(round.id)}
              >
                <Maximize2 className="mr-2 h-4 w-4" />
                Modo apresentação
              </Button>
            </div>

            <div className="grid grid-cols-1 [@media(orientation:landscape)_and_(max-height:500px)]:grid-cols-2 lg:grid-cols-2 gap-4 [@media(orientation:landscape)_and_(max-height:500px)]:gap-3 lg:gap-6">
              {round.tables.map((table, tableIndex) => (
                <TableCard
                  key={table.id}
                  table={table}
                  tableNumber={tableIndex + 1}
                  tournamentId={tournament.id}
                  roundId={round.id}
                  doublesTableLayout={
                    doubles && table.players.length === 4
                  }
                  doublesTeamScoring={
                    doubles && table.players.length === 4
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
