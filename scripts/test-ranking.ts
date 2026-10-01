import assert from 'node:assert/strict';
import type { Player, Tournament } from '../src/app/types/tournament';
import { buildCommanderTableResults } from '../src/app/utils/commanderTableScoring';
import { buildDoublesTeamTableResults } from '../src/app/utils/doublesTableScoring';
import { isTableWin } from '../src/app/utils/scoring';
import { stripRoundsForStorage } from '../src/app/utils/roundPersistence';
import { hydrateRoundsWithPlayers } from '../src/app/utils/tournamentHydration';
import { applyTableResults } from '../src/app/utils/tournamentResults';
import {
  calculatePlayerStats, calculateDoublesTeamStats, describeRankingTiebreak,
  playerStatsToSnapshot, playerStatsAreTied,
} from '../src/app/utils/tournamentRanking';
import { aggregateMonthlyLeague, describeMonthlyLeagueTiebreak } from '../src/app/utils/monthlyLeague';

const players: Player[] = ['Ana', 'Bia', 'Caio', 'Davi'].map((name, index) => ({
  id: `entry-${index}`, playerId: `global-${index}`, name,
}));

function tournament(scores: number[][], modality: Tournament['modality'] = 'weekly_cmd100'): Tournament {
  return {
    id: 'test', name: 'Teste', createdAt: new Date('2026-10-01T12:00:00Z'),
    leagueYear: 2026, leagueMonth: 10, modality, players,
    rounds: scores.map((values, index) => ({
      id: `r${index + 1}`, number: index + 1,
      tables: [{ id: `t${index + 1}`, players, results: buildCommanderTableResults(players,
        Object.fromEntries(players.map((p, i) => [p.id, String(values[i])]))
      )! }],
    })),
  };
}
function describe(t: Tournament) {
  return describeRankingTiebreak(calculatePlayerStats(t).map(playerStatsToSnapshot));
}

// Round three resolves equal totals and equal table wins, regardless of names.
const laterRound = tournament([[4, 1, 2, 0], [2, 2, 2, 0], [1, 4, 2, 0]]);
assert.equal(calculatePlayerStats(laterRound)[0].playerName, 'Bia');
assert.match(describe(laterRound)!, /rodada 3.*R3 > R2 > R1/);
const roundTwo = tournament([[4, 1, 2, 0], [1, 4, 2, 0], [2, 2, 2, 0]]);
assert.match(describe(roundTwo)!, /rodada 2/);

// More wins precede later-round performance; total points precede both.
const wins = tournament([[4, 2, 1, 0], [2, 2, 1, 0], [0, 2, 1, 0]]);
assert.equal(calculatePlayerStats(wins)[0].playerName, 'Ana');
assert.match(describe(wins)!, /vitórias em mesas \(1 contra 0\)/);
const points = tournament([[4, 3, 0, 0], [0, 3, 0, 0], [0, 0, 0, 0]]);
assert.equal(calculatePlayerStats(points)[0].playerName, 'Bia');
assert.equal(describe(points), null);
assert.equal(describe(tournament([[1, 1, 1, 1]])), null);
assert.equal(describe(tournament([])), null);
const lowerTie = tournament([[4, 2, 1, 0], [4, 1, 2, 0]]);
assert.match(describe(lowerTie)!, /Caio ficou à frente de Bia/);
const exactTie = calculatePlayerStats(tournament([[1, 1, 1, 1]]));
assert.ok(playerStatsAreTied(exactTie[0], exactTie[1]));

// Outcome, rather than awarded points, identifies historical and doubled wins.
assert.ok(isTableWin({ playerId: 'a', outcome: { type: 'place', place: 1 }, points: 10 }));
assert.ok(isTableWin({ playerId: 'a', outcome: { type: 'points', value: 4 }, points: 8 }));
assert.ok(!isTableWin({ playerId: 'a', outcome: { type: 'place', place: 2 }, points: 5 }));
assert.ok(!isTableWin({ playerId: 'a', outcome: { type: 'tie' }, points: 1 }));
for (const value of [0, 1, 2, 3] as const) {
  assert.ok(!isTableWin({ playerId: 'a', outcome: { type: 'points', value }, points: value }));
}

// Exercise the save transition, storage serialization, reload and an edit.
const pending = structuredClone(laterRound);
pending.rounds[2].tables[0].results = undefined;
const saved = applyTableResults(pending, 'r3', 't3', laterRound.rounds[2].tables[0].results!);
const reloaded = { ...saved, rounds: hydrateRoundsWithPlayers(
  JSON.parse(JSON.stringify(stripRoundsForStorage(saved.rounds))), players
) };
assert.deepEqual(calculatePlayerStats(reloaded), calculatePlayerStats(laterRound));
const edited = applyTableResults(reloaded, 'r3', 't3', buildCommanderTableResults(players,
  { 'entry-0': '4', 'entry-1': '1', 'entry-2': '2', 'entry-3': '0' })!);
assert.equal(calculatePlayerStats(edited)[0].tableWinCount, 2);
assert.equal(aggregateMonthlyLeague([reloaded], 2026, 10)[0].displayName, 'Bia');
assert.equal(aggregateMonthlyLeague([edited], 2026, 10)[0].displayName, 'Ana');

// A daily title is awarded only once the planned tournament is fully scored.
for (const incomplete of [pending, tournament([[4, 1, 2, 0]]), tournament([])]) {
  assert.ok(aggregateMonthlyLeague([incomplete], 2026, 10).every(row => row.firstPlaceCount === 0));
}
const monthly = aggregateMonthlyLeague([laterRound], 2026, 10);
assert.equal(monthly[0].firstPlaceCount, 1);
assert.equal(monthly[1].firstPlaceCount, 0);
assert.match(describeMonthlyLeagueTiebreak(monthly)!, /vitórias em torneios diários/);
assert.equal(describeMonthlyLeagueTiebreak(aggregateMonthlyLeague([points], 2026, 10)), null);
// With no daily title yet, table wins decide tied monthly points.
const partial = tournament([[4, 3, 0, 0], [2, 3, 0, 0]]);
const tableWins = aggregateMonthlyLeague([partial], 2026, 10);
assert.equal(tableWins[0].displayName, 'Ana');
assert.equal(tableWins[0].tableFirstPlaceCount, 1);
assert.match(describeMonthlyLeagueTiebreak(tableWins)!, /primeiros lugares em mesas/);
const shared = aggregateMonthlyLeague([tournament([[1,1,1,1], [1,1,1,1], [1,1,1,1]])], 2026, 10);
assert.ok(shared.every(row => row.firstPlaceCount === 1));
assert.equal(describeMonthlyLeagueTiebreak(shared), null);
assert.deepEqual(aggregateMonthlyLeague([laterRound], 2026, 9), []);
assert.deepEqual(aggregateMonthlyLeague([{ ...laterRound, modality: 'weekly_pauper' }], 2026, 10), []);

// The same daily criteria apply to Free Commander and doubles; team wins count once.
assert.equal(calculatePlayerStats({ ...laterRound, modality: 'cmd_open_table' })[0].playerName, 'Bia');
const doubles = tournament([[0,0,0,0], [0,0,0,0]], 'doubles_cmd');
doubles.players = players.map((p, i) => ({ ...p, partnerId: players[i ^ 1].id }));
for (const round of doubles.rounds) {
  round.tables[0].players = doubles.players;
  round.tables[0].results = buildDoublesTeamTableResults(doubles.players, 'team1_wins');
}
assert.equal(calculateDoublesTeamStats(doubles)[0].tableWinCount, 2);
assert.deepEqual(aggregateMonthlyLeague([doubles], 2026, 10), []);
console.log('Ranking: daily/monthly tiebreaks, persistence, edits, legacy outcomes and doubles passed.');
