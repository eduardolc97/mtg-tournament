import { useMemo, useState } from 'react';
import { normalizeTournamentModality } from '../../constants/tournamentModality';
import { Tournament } from '../../types/tournament';
import { canGenerateTournamentRounds } from '../../utils/lateJoinPlayer';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Target, Circle, Maximize2, Sparkles, Loader2 } from 'lucide-react';
import TableCard from './TableCard';
import RoundPresentationDialog from './RoundPresentationDialog';
import { isRoundFullyScored } from '../../utils/finalRound';
import { toast } from 'sonner';

interface RoundsTabProps {
  tournament: Tournament;
  onGenerateRounds?: (tournamentId: string) => Promise<void>;
}

export default function RoundsTab({
  tournament,
  onGenerateRounds,
}: RoundsTabProps) {
  const doubles =
    normalizeTournamentModality(tournament.modality) === 'doubles_cmd';
  const singles =
    normalizeTournamentModality(tournament.modality) !== 'doubles_cmd';
  const [generating, setGenerating] = useState(false);
  const [presentationRoundId, setPresentationRoundId] = useState<string | null>(
    null
  );
  const presentationRound = presentationRoundId
    ? tournament.rounds.find((r) => r.id === presentationRoundId)
    : undefined;

  const generateGuard = useMemo(
    () => canGenerateTournamentRounds(tournament),
    [tournament]
  );

  const handleGenerateRounds = async () => {
    if (!onGenerateRounds || !generateGuard.ok) {
      if (generateGuard.reason) {
        toast.error(generateGuard.reason);
      }
      return;
    }
    setGenerating(true);
    try {
      await onGenerateRounds(tournament.id);
      toast.success('Mesas geradas com sucesso!');
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Não foi possível gerar as rodadas.'
      );
    } finally {
      setGenerating(false);
    }
  };

  if (tournament.rounds.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-purple-900/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Rodadas
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center space-y-4">
          <Target className="w-16 h-16 text-slate-600 mx-auto" />
          <p className="text-slate-400 max-w-md mx-auto">
            {singles
              ? 'Nenhuma mesa gerada ainda. Ajuste o elenco na aba Jogadores e use o botão abaixo quando estiver pronto. Este passo só pode ser feito uma vez.'
              : 'Nenhuma rodada gerada ainda.'}
          </p>
          {singles && onGenerateRounds && (
            <>
              <p className="text-sm text-slate-500">
                {tournament.players.length} jogador
                {tournament.players.length !== 1 ? 'es' : ''} no elenco · mesas
                de 3 ou 4 jogadores
              </p>
              <Button
                onClick={handleGenerateRounds}
                disabled={!generateGuard.ok || generating}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                {generating ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 mr-2" />
                )}
                Gerar Mesas
              </Button>
              {!generateGuard.ok && generateGuard.reason && (
                <p className="text-sm text-amber-400/90 max-w-md mx-auto">
                  {generateGuard.reason}
                </p>
              )}
            </>
          )}
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
