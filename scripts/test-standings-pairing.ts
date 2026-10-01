import assert from 'node:assert/strict';
import type { Player, Round, Table, TableResult, Tournament } from '../src/app/types/tournament';
import { applyTableResults } from '../src/app/utils/tournamentResults';
import { buildSinglesStandingsRound } from '../src/app/utils/standingsPairing';
import { generateInitialRoundsForTournament, regenerateSwissRoundsOneAndTwoForTournament } from '../src/app/utils/lateJoinPlayer';
import { generateDoublesSwissRounds } from '../src/app/utils/doublesRoundGenerator';
import { buildDoublesTeamTableResults } from '../src/app/utils/doublesTableScoring';
import { calculatePlayerStats } from '../src/app/utils/tournamentRanking';
import { computeTableSizes } from '../src/app/utils/roundGenerator';

function createTournament(count: number, modality: Tournament['modality'] = 'weekly_cmd100', fourth = false): Tournament {
  const players: Player[] = Array.from({ length: count }, (_, i) => ({
    id: `p${i}`, playerId: `global${i}`, name: `Jogador ${String(i).padStart(2, '0')}`,
  }));
  const base: Tournament = {
    id: 'test', name: 'Teste', players, rounds: [], createdAt: new Date(),
    leagueYear: 2026, leagueMonth: 10, modality,
    openTableIncludeFourthRound: fourth, doublesIncludeFourthSwissRound: fourth,
  };
  return modality === 'doubles_cmd'
    ? { ...base, ...generateDoublesSwissRounds(players, fourth) }
    : generateInitialRoundsForTournament(base);
}

function results(table: Table, shift = 0): TableResult[] {
  return table.players.map((player, i) => {
    const value = [4, 2, 1, 0][(i + shift) % table.players.length] as 0 | 1 | 2 | 4;
    return { playerId: player.id, outcome: { type: 'points', value }, points: value };
  });
}

function finishRound(tournament: Tournament, number: number): Tournament {
  const round = tournament.rounds.find(round => round.number === number)!;
  let current = tournament;
  for (const [i, table] of round.tables.entries()) {
    current = applyTableResults(current, round.id, table.id, tournament.modality === 'doubles_cmd'
      ? buildDoublesTeamTableResults(table.players, 'team1_wins') : results(table));
    if (i < round.tables.length - 1) assert.equal(current.rounds.length, tournament.rounds.length);
  }
  return current;
}

function signature(table: Table): string {
  return table.players.map(player => player.id).sort().join(',');
}

function checkRound(tournament: Tournament, round: Round) {
  assert.deepEqual(round.tables.flatMap(table => table.players.map(player => player.id)).sort(),
    tournament.players.map(player => player.id).sort());
  assert.deepEqual(round.tables.map(table => table.players.length).sort(), computeTableSizes(tournament.players.length).sort());
}

// Deterministic random seeds exercise both generation and optimization reproducibly.
const originalRandom = Math.random;
try {
  for (let seed = 1; seed <= 3; seed++) {
    let state = seed;
    Math.random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (const count of [3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 24, 32]) {
      const initial = createTournament(count);
      assert.equal(initial.rounds.length, 1);
      assert.equal(regenerateSwissRoundsOneAndTwoForTournament(initial).rounds.length, 1);
      const next = finishRound(initial, 1);
      assert.equal(next.rounds.length, 2);
      const second = next.rounds[1];
      checkRound(next, second);
      const winners = new Set(calculatePlayerStats({ ...next, rounds: [next.rounds[0]] })
        .filter(row => row.tableWinCount > 0).map(row => row.playerId));
      const fourSeats = computeTableSizes(count).filter(size => size === 4).length * 4;
      const protectedWinners = second.tables.filter(table => table.players.length === 4)
        .flatMap(table => table.players).filter(player => winners.has(player.id)).length;
      assert.equal(protectedWinners, Math.min(winners.size, fourSeats), `Winner protection: ${count}`);
      if (count > 4) {
        const firstTables = new Set(next.rounds[0].tables.map(signature));
        assert.ok(second.tables.every(table => !firstTables.has(signature(table))), `Repeated table: ${count}, seed ${seed}`);
      }
      if (count === 16) {
        // Four mixed tables, not a table containing all four winners.
        assert.ok(second.tables.every(table => table.players.filter(player => winners.has(player.id)).length === 1));
        const stats = new Map(calculatePlayerStats(next).map(row => [row.playerId, row]));
        assert.ok(second.tables.every(table => table.players.some(player => stats.get(player.id)!.totalPoints === 2)));
      }
      // Editing R1 must leave the entire already-generated R2 byte-for-byte intact.
      const before = JSON.stringify(second);
      const firstTable = next.rounds[0].tables[0];
      const edited = applyTableResults(next, next.rounds[0].id, firstTable.id, results(firstTable, 1));
      assert.equal(JSON.stringify(edited.rounds[1]), before);
      assert.equal(edited.rounds.length, 2);
      const completed = finishRound(finishRound(edited, 2), 3);
      assert.equal(completed.rounds.length, 3);
      const later = JSON.stringify(completed.rounds.slice(1));
      const corrected = applyTableResults(completed, completed.rounds[0].id, firstTable.id, results(firstTable));
      assert.equal(JSON.stringify(corrected.rounds.slice(1)), later);
      assert.equal(corrected.rounds.length, 3);
    }
  }

  // R3 strongly groups accumulated points, breaking score ties by table wins.
  let ranked = createTournament(8, 'cmd_open_table', true);
  const scores = [[3, 3], [4, 2], [4, 4], [4, 3], [4, 2], [1, 1], [0, 0], [0, 0]];
  ranked.rounds = [1, 2].map(number => ({
    ...ranked.rounds[0], id: `round-${number}`, number,
    tables: ranked.rounds[0].tables.map(table => ({ ...table,
      results: table.players.map(player => {
        const value = scores[Number(player.id.slice(1))][number - 1] as 0 | 1 | 2 | 3 | 4;
        return { playerId: player.id, outcome: { type: 'points' as const, value }, points: value };
      }),
    })),
  }));
  const third = buildSinglesStandingsRound(ranked, 3);
  assert.deepEqual(third.tables[0].players.map(player => player.id), ['p2', 'p3', 'p1', 'p4']);
  assert.ok(!third.tables[0].isFinalTable);
  ranked = { ...ranked, rounds: [...ranked.rounds, third] };
  const fourth = finishRound(ranked, 3);
  assert.equal(fourth.rounds.length, 4);
  assert.ok(fourth.rounds[3].tables[0].isFinalTable);
  assert.equal(finishRound(fourth, 4).rounds.length, 4);

  // Existing tournaments may already contain multiple unscored rounds. Keep them.
  const legacy = createTournament(12);
  legacy.rounds.push({ ...structuredClone(legacy.rounds[0]), id: 'round-2', number: 2 });
  const legacyTables = JSON.stringify(legacy.rounds[1]);
  const legacyUpdated = finishRound(legacy, 1);
  assert.equal(legacyUpdated.rounds.length, 2);
  assert.equal(JSON.stringify(legacyUpdated.rounds[1]), legacyTables);

  // No winners (all draws) still produces complete, valid mixed tables.
  const draws = createTournament(14);
  for (const table of draws.rounds[0].tables) {
    table.results = table.players.map(player => ({
      playerId: player.id, outcome: { type: 'points', value: 2 }, points: 2,
    }));
  }
  checkRound(draws, buildSinglesStandingsRound(draws, 2));

  // Pauper never enters automatic table generation.
  const pauper = { ...draws, modality: 'weekly_pauper' as const };
  const pauperTable = pauper.rounds[0].tables[0];
  assert.equal(applyTableResults(pauper, pauper.rounds[0].id, pauperTable.id,
    pauperTable.results!).rounds.length, 1);

  // More previous winners than four-player seats: protect the highest-ranked ones.
  let crowded = finishRound(createTournament(10, 'cmd_open_table', true), 1);
  crowded = finishRound(crowded, 2);
  const standings = calculatePlayerStats({ ...crowded, rounds: crowded.rounds.slice(0, 2) });
  const expected = standings.filter(row => row.tableWinCount > 0).slice(0, 4).map(row => row.playerId);
  const four = crowded.rounds[2].tables.find(table => table.players.length === 4)!;
  assert.ok(expected.every(id => four.players.some(player => player.id === id)));

  // Duos remain intact through all formats, with new opponents before the final.
  for (const [count, fourthRound, planned] of [[4, false, 2], [12, false, 2], [16, false, 3], [16, true, 4]] as const) {
    let doubles = createTournament(count, 'doubles_cmd', fourthRound);
    assert.equal(doubles.rounds.length, 1);
    const partners = new Map(doubles.players.map(player => [player.id, player.partnerId]));
    for (let number = 1; number <= planned; number++) {
      const round = doubles.rounds[number - 1];
      for (const table of round.tables) {
        assert.equal(table.players.length, 4);
        assert.equal(partners.get(table.players[0].id), table.players[1].id);
        assert.equal(partners.get(table.players[2].id), table.players[3].id);
      }
      doubles = finishRound(doubles, number);
      assert.equal(doubles.rounds.length, Math.min(number + 1, planned));
    }
    assert.ok(doubles.rounds[planned - 1].tables[0].isLeadersTable);
    const savedFollowingRounds = JSON.stringify(doubles.rounds.slice(1));
    const first = doubles.rounds[0];
    const corrected = applyTableResults(doubles, first.id, first.tables[0].id,
      buildDoublesTeamTableResults(first.tables[0].players, 'team2_wins'));
    assert.equal(JSON.stringify(corrected.rounds.slice(1)), savedFollowingRounds);
    if (planned === 4) {
      const seen = new Set<string>();
      for (const round of doubles.rounds.slice(0, 3)) {
        for (const table of round.tables) {
          assert.ok(!seen.has(signature(table)), 'Repeated preliminary doubles match');
          seen.add(signature(table));
        }
      }
    }
  }
} finally {
  Math.random = originalRandom;
}
console.log('Standings pairing: sequential rounds, winner protection, mixed R2, ranked R3, fixed partners and immutable existing tables passed.');
