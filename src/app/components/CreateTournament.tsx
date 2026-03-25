import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTournaments } from '../context/TournamentContext';
import { Player, Tournament } from '../types/tournament';
import {
  DEFAULT_TOURNAMENT_MODALITY,
  type TournamentModality,
} from '../constants/tournamentModality';
import { mergePresetAndTournamentPlayerNames } from '../utils/knownPlayerNames';
import { playerNameKey } from '../utils/monthlyLeague';
import { LEAGUE_MONTHS_PT, leagueYearOptions } from '../constants/leaguePeriod';
import {
  generateDoublesSwissRounds,
  isValidDoublesPlayerCount,
} from '../utils/doublesRoundGenerator';
import {
  generateSwissRoundsOneAndTwo,
  isValidTournamentPlayerCount,
} from '../utils/roundGenerator';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { UserPlus, X, Sparkles, ArrowLeft, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';
import { fetchPresetPlayerNames } from '../lib/tournamentsApi';
import PageHeaderBrand from './PageHeaderBrand';

export default function CreateTournament() {
  const navigate = useNavigate();
  const { addTournament, tournaments } = useTournaments();

  const [presetNames, setPresetNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchPresetPlayerNames()
      .then((names) => {
        if (!cancelled) {
          setPresetNames(names);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPresetNames([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const knownNames = useMemo(
    () => mergePresetAndTournamentPlayerNames(presetNames, tournaments),
    [presetNames, tournaments]
  );

  const [tournamentName, setTournamentName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const suggestContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!suggestOpen) {
      return;
    }
    const onDocMouseDown = (e: MouseEvent) => {
      const el = suggestContainerRef.current;
      if (el && !el.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [suggestOpen]);

  const excludedNameKeys = useMemo(
    () => new Set(players.map((p) => playerNameKey(p.name))),
    [players]
  );

  const availableKnownCount = useMemo(() => {
    return knownNames.filter(
      (n) => !excludedNameKeys.has(playerNameKey(n))
    ).length;
  }, [knownNames, excludedNameKeys]);

  const suggestions = useMemo(() => {
    const available = knownNames.filter(
      (n) => !excludedNameKeys.has(playerNameKey(n))
    );
    const q = playerName.trim().toLowerCase();
    if (!q) {
      return available.slice(0, 50);
    }
    return available
      .filter((n) => n.toLowerCase().includes(q))
      .slice(0, 50);
  }, [knownNames, excludedNameKeys, playerName]);
  const now = new Date();
  const [leagueMonth, setLeagueMonth] = useState(now.getMonth() + 1);
  const [leagueYear, setLeagueYear] = useState(now.getFullYear());
  const [modality, setModality] = useState<TournamentModality>(
    DEFAULT_TOURNAMENT_MODALITY
  );
  const [includeFourthDoublesRound, setIncludeFourthDoublesRound] =
    useState(false);

  const minPlayers = modality === 'doubles_cmd' ? 4 : 3;
  const playerCountOk =
    modality === 'doubles_cmd'
      ? isValidDoublesPlayerCount(players.length)
      : isValidTournamentPlayerCount(players.length);

  const addPlayerByName = (rawName: string) => {
    const trimmed = rawName.trim();
    if (!trimmed) {
      toast.error('Digite o nome do jogador');
      return;
    }

    if (players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Jogador já adicionado');
      return;
    }

    const newPlayer: Player = {
      id: `player-${Date.now()}-${Math.random()}`,
      name: trimmed,
    };

    setPlayers((prev) => [...prev, newPlayer]);
    setPlayerName('');
    setSuggestOpen(false);
    toast.success(`${newPlayer.name} adicionado!`);
  };

  const handleAddPlayer = () => {
    addPlayerByName(playerName);
  };

  const applySuggestedName = (name: string) => {
    addPlayerByName(name);
  };

  const handleRemovePlayer = (playerId: string) => {
    setPlayers(players.filter((p) => p.id !== playerId));
  };

  const handleGenerateRounds = async () => {
    if (players.length < minPlayers) {
      toast.error(
        modality === 'doubles_cmd'
          ? 'CMD em duplas: mínimo 4 jogadores (múltiplo de 4)'
          : 'É necessário pelo menos 3 jogadores'
      );
      return;
    }

    if (!tournamentName.trim()) {
      toast.error('Digite o nome do campeonato');
      return;
    }

    if (!playerCountOk) {
      toast.error(
        modality === 'doubles_cmd'
          ? 'CMD em duplas: use 8, 12, 16… jogadores (múltiplo de 4).'
          : 'Com mesas só de 3 ou 4 jogadores, 5 pessoas não fecha. Use 4, 6, 7, 8… ou outro total válido.'
      );
      return;
    }

    let rounds;
    let playersOut: Player[];
    try {
      if (modality === 'doubles_cmd') {
        const gen = generateDoublesSwissRounds(
          players,
          includeFourthDoublesRound
        );
        playersOut = gen.players;
        rounds = gen.rounds;
      } else {
        playersOut = players;
        rounds = generateSwissRoundsOneAndTwo(players);
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Não foi possível montar as mesas.'
      );
      return;
    }

    const tournament: Tournament = {
      id: `tournament-${Date.now()}`,
      name: tournamentName.trim(),
      players: playersOut,
      rounds,
      createdAt: new Date(),
      leagueYear,
      leagueMonth,
      modality,
      doublesIncludeFourthSwissRound:
        modality === 'doubles_cmd' ? includeFourthDoublesRound : null,
    };

    try {
      await addTournament(tournament);
      toast.success('Campeonato criado com sucesso!');
      navigate(`/tournament/${tournament.id}`);
    } catch {
      toast.error('Não foi possível salvar o campeonato. Verifique se a API está rodando.');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      <div className="container mx-auto px-3 py-6 max-w-4xl sm:px-4 sm:py-8 [@media(orientation:landscape)_and_(max-height:500px)]:py-4">
        {/* Header */}
        <div className="mb-6 sm:mb-8 [@media(orientation:landscape)_and_(max-height:500px)]:mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-slate-300 hover:text-white mb-3 sm:mb-4 [@media(orientation:landscape)_and_(max-height:500px)]:mb-2 [@media(orientation:landscape)_and_(max-height:500px)]:h-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <PageHeaderBrand variant="create" className="mb-2">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Novo Campeonato
            </h1>
          </PageHeaderBrand>
        </div>

        {/* Tournament Name */}
        <Card className="bg-slate-900/50 border-purple-900/50 backdrop-blur mb-6">
          <CardHeader>
            <CardTitle className="text-white">Nome do Campeonato</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Ex: Torneio Commander - Março 2026"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-purple-900/50 backdrop-blur mb-6">
          <CardHeader>
            <CardTitle className="text-white">Modalidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={modality}
              onValueChange={(v) => setModality(v as TournamentModality)}
            >
              <SelectTrigger className="w-full max-w-md bg-slate-800/50 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem
                  value="weekly_cmd100"
                  className="text-white focus:bg-purple-600/35"
                >
                  Liga CMD 100 semanal
                </SelectItem>
                <SelectItem
                  value="doubles_cmd"
                  className="text-white focus:bg-purple-600/35"
                >
                  CMD em duplas (2×2)
                </SelectItem>
                <SelectItem
                  value="cmd_open_table"
                  className="text-white focus:bg-purple-600/35"
                >
                  CMD mesão livre
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-400">
              {modality === 'weekly_cmd100' && (
                <>
                  Mesas de 4 (ou mix com mesas de 3), suíço em 2 rodadas e mesa
                  final com os líderes — igual ao formato que você já usa.
                </>
              )}
              {modality === 'doubles_cmd' && (
                <>
                  Duplas sorteadas; mesa 2×2; pontuação e ranking por dupla. A
                  última rodada é sempre a da mesa dos líderes (2×2 das duas
                  melhores duplas) e as demais mesas — o torneio termina aí.
                  Menos de 8 duplas: 2 rodadas no total. Com 8 ou mais: 3; marque
                  a opção abaixo para{' '}
                  <span className="text-slate-300">4 rodadas no total</span>{' '}
                  (uma suíça a mais antes da mesa dos líderes).
                </>
              )}
              {modality === 'cmd_open_table' && (
                <>
                  Mesmas regras e pontuação da Liga CMD 100 semanal; apenas o
                  rótulo do evento é “mesão livre”.
                </>
              )}
            </p>
            {modality === 'doubles_cmd' && (
              <div
                className="flex flex-col gap-2 rounded-lg border border-amber-900/45 bg-amber-950/25 p-4"
                role="group"
                aria-labelledby="doubles-fourth-swiss-title"
              >
                <p
                  id="doubles-fourth-swiss-title"
                  className="text-sm font-medium text-amber-200/95"
                >
                  4ª rodada suíça (8+ duplas)
                </p>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="doubles-fourth-swiss"
                    checked={includeFourthDoublesRound}
                    onCheckedChange={(c) =>
                      setIncludeFourthDoublesRound(c === true)
                    }
                    className="mt-0.5 border-slate-500 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-500"
                  />
                  <label
                    htmlFor="doubles-fourth-swiss"
                    className="text-sm text-slate-300 leading-relaxed cursor-pointer select-none"
                  >
                    Com <span className="text-slate-200">8 ou mais duplas</span>,
                    incluir uma <span className="text-slate-200">4ª rodada</span>{' '}
                    (suíça extra; no máximo 4 rodadas, sem rodada depois da mesa
                    dos líderes). Com menos de 8 duplas esta opção é ignorada
                    (2 rodadas).
                  </label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-purple-900/50 backdrop-blur mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Liga (mês / ano)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 mb-4">
              {modality === 'weekly_cmd100' ? (
                <>
                  Este campeonato entra na classificação geral deste mês para
                  prêmios da liga.
                </>
              ) : (
                <>
                  Apenas a modalidade{' '}
                  <span className="text-slate-300">Liga CMD 100 semanal</span>{' '}
                  entra na liga mensal.{' '}
                  {modality === 'cmd_open_table'
                    ? 'Mesão livre não soma pontos na liga.'
                    : 'CMD em duplas não soma pontos na liga.'}
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Mês</p>
                <Select
                  value={String(leagueMonth)}
                  onValueChange={(v) => setLeagueMonth(parseInt(v, 10))}
                >
                  <SelectTrigger className="w-[200px] bg-slate-800/50 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {LEAGUE_MONTHS_PT.map((m) => (
                      <SelectItem
                        key={m.value}
                        value={String(m.value)}
                        className="text-white"
                      >
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Ano</p>
                <Select
                  value={String(leagueYear)}
                  onValueChange={(v) => setLeagueYear(parseInt(v, 10))}
                >
                  <SelectTrigger className="w-[120px] bg-slate-800/50 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {leagueYearOptions().map((y) => (
                      <SelectItem
                        key={y}
                        value={String(y)}
                        className="text-white"
                      >
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-purple-900/50 backdrop-blur mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-400" />
              Adicionar Jogadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 mb-3">
              Ao digitar, aparecem nomes já cadastrados — clique em um para
              adicionar na hora. Você ainda pode digitar um nome novo e usar
              Adicionar ou Enter.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div
                ref={suggestContainerRef}
                className="relative flex-1 min-w-0 w-full"
              >
                <Input
                  placeholder="Nome do jogador"
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    if (knownNames.length > 0) {
                      setSuggestOpen(true);
                    }
                  }}
                  onFocus={() => {
                    if (knownNames.length > 0) {
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
                {suggestOpen && knownNames.length > 0 && (
                  <div
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-600 bg-slate-900 py-1 shadow-xl"
                    role="listbox"
                    aria-label="Nomes já cadastrados"
                  >
                    <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Já cadastrados antes
                    </p>
                    {suggestions.length > 0 ? (
                      suggestions.map((name) => (
                        <button
                          key={playerNameKey(name)}
                          type="button"
                          role="option"
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white hover:bg-purple-600/35"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applySuggestedName(name);
                          }}
                        >
                          <User className="h-4 w-4 shrink-0 text-slate-400" />
                          {name}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-4 text-center text-sm text-slate-500">
                        {availableKnownCount === 0
                          ? 'Todos os nomes conhecidos já estão nesta lista. Digite um jogador novo.'
                          : 'Nenhum nome combina com a busca. Você pode usar o texto digitado como nome novo.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <Button
                onClick={handleAddPlayer}
                className="bg-blue-600 hover:bg-blue-700 shrink-0"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {/* Players List */}
            {players.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm text-slate-400 mb-3">
                  {players.length} {players.length === 1 ? 'jogador' : 'jogadores'} adicionado{players.length === 1 ? '' : 's'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3"
                    >
                      <span className="text-white">{player.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePlayer(player.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                Nenhum jogador adicionado ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleGenerateRounds}
            disabled={
              players.length < minPlayers ||
              !tournamentName.trim() ||
              !playerCountOk
            }
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Gerar Rodadas
          </Button>
        </div>

        {players.length > 0 && players.length < minPlayers && (
          <p className="text-center text-slate-500 text-sm mt-4">
            Adicione pelo menos {minPlayers} jogadores para gerar as rodadas
          </p>
        )}
        {modality !== 'doubles_cmd' && players.length === 5 && (
          <p className="text-center text-amber-400/90 text-sm mt-4 max-w-md mx-auto">
            5 jogadores não permitem só mesas de 3 ou 4 (sempre sobra 1 ou 2).
            Adicione ou remova alguém (ex.: 4 ou 6 jogadores).
          </p>
        )}
        {modality === 'doubles_cmd' &&
          players.length > 0 &&
          !isValidDoublesPlayerCount(players.length) && (
            <p className="text-center text-amber-400/90 text-sm mt-4 max-w-md mx-auto">
              Em duplas, o total de jogadores precisa ser múltiplo de 4 (cada
              mesa: dupla vs dupla).
            </p>
          )}
      </div>
    </div>
  );
}
