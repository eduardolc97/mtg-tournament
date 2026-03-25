import { useParams, useNavigate } from 'react-router';
import { useTournaments } from '../context/TournamentContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft, Trophy, Users, Target, Loader2, Calendar } from 'lucide-react';
import {
  normalizeTournamentModality,
  tournamentModalityLabelPt,
} from '../constants/tournamentModality';
import { monthLabel } from '../utils/monthlyLeague';
import PlayersTab from './tournament/PlayersTab';
import RoundsTab from './tournament/RoundsTab';
import RankingTab from './tournament/RankingTab';
import CurrentRoundIndicator from './tournament/CurrentRoundIndicator';

export default function TournamentView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTournamentById, loading } = useTournaments();

  const tournament = getTournamentById(id!);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
          <p>Carregando…</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-900/50 border-purple-900/50 backdrop-blur">
          <CardContent className="py-12 text-center">
            <p className="text-white text-xl mb-4">Campeonato não encontrado</p>
            <Button onClick={() => navigate('/')} variant="outline">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const modality = normalizeTournamentModality(tournament.modality);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      <div className="container mx-auto px-3 py-6 max-w-6xl [@media(orientation:landscape)_and_(max-height:500px)]:px-3 [@media(orientation:landscape)_and_(max-height:500px)]:py-3 sm:px-4 sm:py-8">
        <div className="mb-6 [@media(orientation:landscape)_and_(max-height:500px)]:mb-3">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-slate-300 hover:text-white mb-2 [@media(orientation:landscape)_and_(max-height:500px)]:mb-1 [@media(orientation:landscape)_and_(max-height:500px)]:h-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 flex-wrap">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400 shrink-0 [@media(orientation:landscape)_and_(max-height:500px)]:w-7 [@media(orientation:landscape)_and_(max-height:500px)]:h-7" />
            <h1 className="text-xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent [@media(orientation:landscape)_and_(max-height:500px)]:text-lg">
              {tournament.name}
            </h1>
          </div>

          <div className="flex flex-wrap gap-3 text-slate-300 mt-2 sm:mt-4 text-xs sm:text-sm [@media(orientation:landscape)_and_(max-height:500px)]:mt-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{tournament.players.length} jogadores</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                {tournament.rounds.length} rodada
                {tournament.rounds.length !== 1 ? 's' : ''}
                {modality === 'doubles_cmd' ? ' (2×2)' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-purple-300/90">
                {tournamentModalityLabelPt(modality)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="capitalize">
                Liga: {monthLabel(tournament.leagueYear, tournament.leagueMonth)}
              </span>
            </div>
          </div>
        </div>

        {/* Current Round Indicator */}
        {tournament.rounds.length > 0 && (
          <CurrentRoundIndicator tournament={tournament} />
        )}

        {/* Tabs */}
        <Tabs defaultValue="rounds" className="w-full min-h-0">
          <TabsList className="bg-slate-900/50 border border-purple-900/50 backdrop-blur mb-4 sm:mb-6 w-full max-w-full inline-flex flex-nowrap overflow-x-auto justify-start h-auto p-1 gap-0.5 sm:w-auto sm:justify-center [@media(orientation:landscape)_and_(max-height:500px)]:mb-3">
            <TabsTrigger
              value="players"
              className="shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm px-2.5 sm:px-3 [@media(orientation:landscape)_and_(max-height:500px)]:py-1.5"
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
              Jogadores
            </TabsTrigger>
            <TabsTrigger
              value="rounds"
              className="shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm px-2.5 sm:px-3 [@media(orientation:landscape)_and_(max-height:500px)]:py-1.5"
            >
              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
              Rodadas
            </TabsTrigger>
            <TabsTrigger
              value="ranking"
              className="shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm px-2.5 sm:px-3 [@media(orientation:landscape)_and_(max-height:500px)]:py-1.5"
            >
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
              Ranking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="players">
            <PlayersTab players={tournament.players} modality={modality} />
          </TabsContent>

          <TabsContent value="rounds">
            <RoundsTab tournament={tournament} />
          </TabsContent>

          <TabsContent value="ranking">
            <RankingTab tournament={tournament} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}