import assert from 'node:assert/strict';
import type { Player, Round } from '../src/app/types/tournament';
import {
  analyzePairingSchedule,
  generateSwissRounds,
} from '../src/app/utils/roundGenerator';

const GENERATIONS_PER_SCENARIO = 10;

function createPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `entry-${index + 1}`,
    playerId: `player-${index + 1}`,
    name: `Jogador ${String(index + 1).padStart(2, '0')}`,
  }));
}

function scheduleSignature(rounds: Round[]): string {
  return rounds
    .map((round) =>
      round.tables
        .map((table) => table.players.map((player) => player.id).sort().join(','))
        .sort()
        .join('|')
    )
    .join(' / ');
}

function assertValidSchedule(rounds: Round[], players: Player[]): void {
  const expectedIds = players.map((player) => player.id).sort();
  for (const round of rounds) {
    const actualIds = round.tables
      .flatMap((table) => {
        assert.ok(
          table.players.length === 3 || table.players.length === 4,
          `Mesa inválida com ${table.players.length} jogadores`
        );
        return table.players.map((player) => player.id);
      })
      .sort();
    assert.deepEqual(actualIds, expectedIds, 'Cada jogador deve aparecer uma vez por rodada');
  }
}

function showExample(rounds: Round[]): void {
  for (const round of rounds) {
    console.log(`\nRodada ${round.number}`);
    round.tables.forEach((table, index) => {
      console.log(
        `  Mesa ${index + 1}: ${table.players.map((player) => player.name).join(', ')}`
      );
    });
  }
}

console.log('Validando pareamentos aleatórios para 14–20 jogadores...');

for (const roundCount of [2, 3]) {
  console.log(`\n${roundCount} rodadas preliminares`);
  for (let playerCount = 14; playerCount <= 20; playerCount++) {
    const players = createPlayers(playerCount);
    const signatures = new Set<string>();
    let worstCompleteRepeats = 0;
    let worstThreePlayerSpread = 0;
    let worstPairMeetings = 0;

    for (let generation = 0; generation < GENERATIONS_PER_SCENARIO; generation++) {
      const rounds = generateSwissRounds(players, roundCount);
      assertValidSchedule(rounds, players);
      signatures.add(scheduleSignature(rounds));
      const metrics = analyzePairingSchedule(rounds, players);
      worstCompleteRepeats = Math.max(
        worstCompleteRepeats,
        metrics.repeatedCompleteTables
      );
      worstThreePlayerSpread = Math.max(
        worstThreePlayerSpread,
        metrics.threePlayerTableSpread
      );
      worstPairMeetings = Math.max(
        worstPairMeetings,
        metrics.maximumPairMeetings
      );
    }

    assert.equal(
      worstCompleteRepeats,
      0,
      `${playerCount} jogadores não deveria repetir mesas completas`
    );
    assert.ok(
      worstThreePlayerSpread <= 1,
      `${playerCount} jogadores deveria manter o rodízio de mesas de 3 equilibrado`
    );
    assert.ok(
      signatures.size > 1,
      `${playerCount} jogadores deveria produzir regenerações diferentes`
    );

    console.log(
      `  ${playerCount} jogadores: ${signatures.size}/${GENERATIONS_PER_SCENARIO} sorteios distintos; ` +
        `mesas repetidas=${worstCompleteRepeats}; rodízio mesa de 3=${worstThreePlayerSpread}; ` +
        `máx. encontros do mesmo par=${worstPairMeetings}`
    );
  }
}

const examplePlayers = createPlayers(17);
const exampleRounds = generateSwissRounds(examplePlayers, 3);
console.log('\nExemplo: 17 jogadores, 3 rodadas preliminares');
showExample(exampleRounds);

console.log('\nTodos os testes de pareamento passaram.');
