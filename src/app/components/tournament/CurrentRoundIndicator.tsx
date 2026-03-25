import { Tournament } from '../../types/tournament';
import { normalizeTournamentModality } from '../../constants/tournamentModality';
import {
  expectedSwissRoundsForTournament,
  plannedRoundsForTournament,
} from '../../utils/tournamentSwiss';
import { Card, CardContent } from '../ui/card';
import { Target, CheckCircle2 } from 'lucide-react';
import { isRoundFullyScored } from '../../utils/finalRound';

interface CurrentRoundIndicatorProps {
  tournament: Tournament;
}

export default function CurrentRoundIndicator({
  tournament,
}: CurrentRoundIndicatorProps) {
  const modality = normalizeTournamentModality(tournament.modality);
  const swissCount = expectedSwissRoundsForTournament(tournament);
  const plannedRounds = plannedRoundsForTournament(tournament);

  let currentRoundNumber = 1;

  for (let i = 0; i < tournament.rounds.length; i++) {
    const round = tournament.rounds[i];
    if (!isRoundFullyScored(round)) {
      currentRoundNumber = round.number;
      break;
    }
    if (i === tournament.rounds.length - 1) {
      currentRoundNumber = round.number;
    }
  }

  const currentRound = tournament.rounds.find(
    (r) => r.number === currentRoundNumber
  );
  if (!currentRound) {
    return null;
  }

  const completedTables = currentRound.tables.filter((table) => {
    return (
      table.results && table.results.length === table.players.length
    );
  }).length;

  const totalTables = currentRound.tables.length;

  const allRoundsComplete = tournament.rounds.every((round) =>
    isRoundFullyScored(round)
  );

  const showFinalPendingHint =
    modality === 'doubles_cmd'
      ? tournament.rounds.length === swissCount - 1 && swissCount >= 2
      : tournament.rounds.length === swissCount && swissCount > 0;

  return (
    <Card className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-700/50 backdrop-blur mb-4 [@media(orientation:landscape)_and_(max-height:500px)]:mb-3">
      <CardContent className="py-4 [@media(orientation:landscape)_and_(max-height:500px)]:py-2">
        <div className="flex flex-col gap-3 [@media(orientation:landscape)_and_(max-height:500px)]:gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {allRoundsComplete ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0 [@media(orientation:landscape)_and_(max-height:500px)]:w-5 [@media(orientation:landscape)_and_(max-height:500px)]:h-5" />
                <div>
                  <h3 className="text-white font-semibold text-sm sm:text-base">
                    Torneio completo
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm">
                    Todas as rodadas foram finalizadas. Confira o ranking
                    final.
                  </p>
                </div>
              </>
            ) : (
              <>
                <Target className="w-6 h-6 text-purple-400 shrink-0 [@media(orientation:landscape)_and_(max-height:500px)]:w-5 [@media(orientation:landscape)_and_(max-height:500px)]:h-5" />
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-sm sm:text-base">
                    Rodada atual: {currentRoundNumber} de {plannedRounds}
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm">
                    {completedTables} de {totalTables}{' '}
                    mesa{totalTables !== 1 ? 's' : ''} completa
                    {totalTables !== 1 ? 's' : ''}
                  </p>
                  {showFinalPendingHint && (
                    <p className="text-slate-400 text-xs mt-1">
                      A última rodada só é criada depois que todas as mesas
                      suíças estiverem preenchidas. Nela há mesas para todos; uma
                      mesa é a dos líderes no acumulado
                      {modality === 'doubles_cmd'
                        ? ' (2×2 das duas melhores duplas).'
                        : ' (4 melhores jogadores).'}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {!allRoundsComplete && (
            <div className="flex gap-2 shrink-0 flex-wrap sm:justify-end">
              {Array.from({ length: plannedRounds }, (_, i) => i + 1).map(
                (num) => {
                  const round = tournament.rounds.find(
                    (r) => r.number === num
                  );
                  const isComplete = round
                    ? isRoundFullyScored(round)
                    : false;
                  const isCurrent = num === currentRoundNumber;

                  return (
                    <div
                      key={num}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        isComplete
                          ? 'bg-green-600 border-green-500'
                          : isCurrent
                            ? 'bg-purple-600 border-purple-500 ring-2 ring-purple-400'
                            : 'bg-slate-700 border-slate-600'
                      }`}
                      title={`Rodada ${num}${isComplete ? ' — completa' : isCurrent ? ' — atual' : ''}`}
                    >
                      <span className="text-white text-xs sm:text-sm font-semibold">
                        {num}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
