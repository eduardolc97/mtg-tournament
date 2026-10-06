import assert from 'node:assert/strict';
import { aggregateCmd100Analytics, availableCmd100Months, latestCmd100Month } from '../src/app/utils/cmd100Analytics';
import { formatCmd100RankingsForCopy } from '../src/app/utils/cmd100RankingCopy';
import { parseStoredUtcTimestamp } from '../src/app/utils/tournamentDate';
import type { Player, Table, Tournament } from '../src/app/types/tournament';

const ana: Player = { id: 'entry-ana', playerId: 'ana', name: 'Ana' };
assert.equal(parseStoredUtcTimestamp('2026-09-17T22:30:00').toISOString(), '2026-09-17T22:30:00.000Z');
const bia: Player = { id: 'entry-bia', playerId: 'bia', name: 'Bia' };
const caio: Player = { id: 'entry-caio', playerId: 'caio', name: 'Caio' };

function table(id: string, players: Player[], winner?: Player): Table {
  return {
    id,
    players,
    results: winner
      ? players.map((player) => ({
          playerId: player.id,
          outcome: { type: 'place' as const, place: (player.playerId === winner.playerId ? 1 : 2) as 1 | 2 },
          points: player.playerId === winner.playerId ? 5 : 3,
        }))
      : undefined,
  };
}

function tournament(id: string, date: string, players: Player[], winner?: Player): Tournament {
  return {
    id,
    name: `Torneio ${id}`,
    createdAt: new Date(date),
    leagueYear: 2026,
    leagueMonth: 10,
    modality: 'weekly_cmd100',
    players,
    rounds: [1, 2, 3].map((number) => ({
      id: `${id}-round-${number}`,
      number,
      tables: [table(`${id}-table-${number}`, players, winner)],
    })),
  };
}

const first = tournament('first', '2026-10-09T01:30:00Z', [ana, bia], ana);
const second = tournament('second', '2026-10-08T23:30:00Z', [ana, caio], caio);
const incomplete = tournament('incomplete', '2026-10-15T22:00:00Z', [ana, bia]);
incomplete.rounds[0].tables[0] = table('partial', [ana, bia], ana);
incomplete.rounds[1].tables[0].results = [{ playerId: ana.id, outcome: { type: 'place', place: 1 }, points: 5 }];
const other = { ...tournament('other', '2026-10-08T22:00:00Z', [ana, bia], ana), modality: 'cmd_open_table' as const };

const november = tournament('november', '2026-11-05T22:00:00Z', [bia, caio], bia);
const history = [first, second, incomplete, other, november];
assert.equal(latestCmd100Month(history), '2026-11');
assert.deepEqual(availableCmd100Months(history), ['2026-11', '2026-10']);
const analytics = aggregateCmd100Analytics(history, '2026-10');
assert.equal(analytics.tournamentCount, 3);
assert.deepEqual(analytics.datesByAttendance.map((row) => [row.label, row.count]), [
  ['08/10/2026', 3],
  ['15/10/2026', 2],
]);
assert.deepEqual(analytics.playersByAttendance.map((row) => [row.id, row.count]), [
  ['ana', 3],
  ['bia', 2],
  ['caio', 1],
]);
assert.deepEqual(analytics.playersByTableWins.map((row) => [row.id, row.count]), [
  ['ana', 4],
  ['caio', 3],
]);
assert.deepEqual(analytics.playersByTournamentWins.map((row) => [row.id, row.count]), [
  ['ana', 1],
  ['caio', 1],
]);
assert.deepEqual(analytics.playersByTournamentWins.map((row) => [row.id, row.winDates]), [
  ['ana', ['08/10/2026']],
  ['caio', ['08/10/2026']],
]);
assert.equal(formatCmd100RankingsForCopy(analytics, '2026-10', 1), [
  'Rankings CMD100 — outubro de 2026',
  'Jogadores mais presentes\n1º Ana — 3 torneios',
  'Mais vitórias em mesas\n1º Ana — 4 vitórias',
  'Mais vitórias em torneios\n1º Ana (08/10/2026) — 1 vitória\n1º Caio (08/10/2026) — 1 vitória',
].join('\n\n'));
assert.match(formatCmd100RankingsForCopy(analytics, '2026-10', 3), /3º Caio — 1 torneio/);
assert.match(formatCmd100RankingsForCopy(analytics, 'all', 'all'), /^Rankings CMD100 — Todo o período/);

const dora: Player = { id: 'entry-dora', playerId: 'dora', name: 'Dora' };
const sharedWinner = tournament('shared', '2026-10-22T22:00:00Z', [ana, bia, caio, dora]);
sharedWinner.rounds.forEach((round) => {
  round.tables = [
    table(`${round.id}-a`, [ana, caio], ana),
    table(`${round.id}-b`, [bia, dora], bia),
  ];
});
const tied = aggregateCmd100Analytics([sharedWinner], '2026-10');
assert.deepEqual(tied.playersByTournamentWins.map((row) => [row.id, row.rank, row.count]), [
  ['ana', 1, 1],
  ['bia', 1, 1],
]);
const repeatedWinner = aggregateCmd100Analytics([
  first,
  tournament('later-win', '2026-10-22T22:00:00Z', [ana, bia], ana),
], '2026-10');
assert.deepEqual(repeatedWinner.playersByTournamentWins[0].winDates, ['22/10/2026', '08/10/2026']);
assert.match(formatCmd100RankingsForCopy(repeatedWinner, '2026-10', 1), /Ana \(22\/10\/2026, 08\/10\/2026\) — 2 vitórias/);
const novemberAnalytics = aggregateCmd100Analytics(history, '2026-11');
assert.equal(novemberAnalytics.tournamentCount, 1);
assert.deepEqual(novemberAnalytics.datesByAttendance.map((row) => [row.label, row.count]), [
  ['05/11/2026', 2],
]);
assert.deepEqual(novemberAnalytics.playersByAttendance.map((row) => row.id), ['bia', 'caio']);
assert.deepEqual(novemberAnalytics.playersByTournamentWins.map((row) => row.id), ['bia']);
const allTime = aggregateCmd100Analytics(history);
assert.equal(allTime.tournamentCount, 4);
assert.deepEqual(allTime.datesByAttendance.map((row) => [row.label, row.count]), [
  ['08/10/2026', 3],
  ['15/10/2026', 2],
  ['05/11/2026', 2],
]);
assert.deepEqual(allTime.playersByAttendance.map((row) => [row.id, row.count]), [
  ['ana', 3],
  ['bia', 3],
  ['caio', 2],
]);
assert.deepEqual(allTime.playersByTableWins.map((row) => [row.id, row.count]), [
  ['ana', 4],
  ['bia', 3],
  ['caio', 3],
]);
assert.deepEqual(allTime.playersByTournamentWins.map((row) => [row.id, row.count]), [
  ['ana', 1],
  ['bia', 1],
  ['caio', 1],
]);
const emptyMonth = aggregateCmd100Analytics(history, '2026-12');
assert.equal(emptyMonth.tournamentCount, 0);
assert.equal(emptyMonth.datesByAttendance.length, 0);
const weekend = tournament('weekend', '2026-09-05T22:00:00Z', [ana, bia], ana);
const weekendMonth = aggregateCmd100Analytics([weekend], '2026-09');
assert.deepEqual(weekendMonth.datesByAttendance.map((row) => row.count), [2]);
const directPoints = tournament('direct-points', '2026-10-01T22:00:00Z', [ana, bia]);
directPoints.rounds.forEach((round) => {
  round.tables[0].results = [
    { playerId: ana.id, outcome: { type: 'points', value: 4 }, points: 4 },
    { playerId: bia.id, outcome: { type: 'points', value: 2 }, points: 2 },
  ];
});
const directPointsAnalytics = aggregateCmd100Analytics([directPoints], '2026-10');
assert.deepEqual(directPointsAnalytics.playersByTableWins.map((row) => [row.id, row.count]), [['ana', 3]]);
console.log('CMD100 analytics aggregation passed');
