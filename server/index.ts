import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: '2mb' }));

function rowToJson(row: {
  id: string;
  name: string;
  createdAt: Date;
  players: unknown;
  rounds: unknown;
  leagueYear: number;
  leagueMonth: number;
  modality: string;
  doublesIncludeFourthSwissRound: boolean | null;
}) {
  return {
    id: row.id,
    name: row.name,
    players: row.players,
    rounds: row.rounds,
    createdAt: row.createdAt.toISOString(),
    leagueYear: row.leagueYear,
    leagueMonth: row.leagueMonth,
    modality: row.modality,
    doublesIncludeFourthSwissRound: row.doublesIncludeFourthSwissRound,
  };
}

function isValidLeagueMonth(m: unknown): m is number {
  return (
    typeof m === 'number' &&
    Number.isInteger(m) &&
    m >= 1 &&
    m <= 12
  );
}

function isValidLeagueYear(y: unknown): y is number {
  return typeof y === 'number' && Number.isInteger(y) && y >= 2000 && y <= 2100;
}

function isValidModality(m: unknown): m is string {
  return (
    m === 'weekly_cmd100' ||
    m === 'doubles_cmd' ||
    m === 'cmd_open_table'
  );
}

function normalizeDoublesFourth(
  v: unknown
): boolean | null {
  if (v === true) {
    return true;
  }
  if (v === false) {
    return false;
  }
  return null;
}

app.get('/api/preset-player-names', async (_req, res) => {
  try {
    const rows = await prisma.presetPlayerName.findMany({
      orderBy: { name: 'asc' },
      select: { name: true },
    });
    res.json(rows.map((r) => r.name));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load preset names' });
  }
});

app.get('/api/tournaments', async (_req, res) => {
  try {
    const rows = await prisma.tournament.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows.map(rowToJson));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load tournaments' });
  }
});

app.post('/api/tournaments', async (req, res) => {
  try {
    const {
      id,
      name,
      players,
      rounds,
      createdAt,
      leagueYear,
      leagueMonth,
      modality,
      doublesIncludeFourthSwissRound,
    } = req.body;
    const mod =
      modality !== undefined && modality !== null && modality !== ''
        ? modality
        : 'weekly_cmd100';
    if (
      typeof id !== 'string' ||
      typeof name !== 'string' ||
      !Array.isArray(players) ||
      !Array.isArray(rounds) ||
      typeof createdAt !== 'string' ||
      !isValidLeagueYear(leagueYear) ||
      !isValidLeagueMonth(leagueMonth) ||
      !isValidModality(mod)
    ) {
      res.status(400).json({ error: 'Invalid tournament' });
      return;
    }
    const row = await prisma.tournament.create({
      data: {
        id,
        name,
        players,
        rounds,
        createdAt: new Date(createdAt),
        leagueYear,
        leagueMonth,
        modality: mod,
        doublesIncludeFourthSwissRound: normalizeDoublesFourth(
          doublesIncludeFourthSwissRound
        ),
      },
    });
    res.status(201).json(rowToJson(row));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

app.put('/api/tournaments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      players,
      rounds,
      createdAt,
      leagueYear,
      leagueMonth,
      modality,
      doublesIncludeFourthSwissRound,
    } = req.body;
    if (
      typeof name !== 'string' ||
      !Array.isArray(players) ||
      !Array.isArray(rounds) ||
      typeof createdAt !== 'string' ||
      !isValidLeagueYear(leagueYear) ||
      !isValidLeagueMonth(leagueMonth) ||
      !isValidModality(modality)
    ) {
      res.status(400).json({ error: 'Invalid tournament' });
      return;
    }
    const row = await prisma.tournament.update({
      where: { id },
      data: {
        name,
        players,
        rounds,
        createdAt: new Date(createdAt),
        leagueYear,
        leagueMonth,
        modality,
        doublesIncludeFourthSwissRound: normalizeDoublesFourth(
          doublesIncludeFourthSwissRound
        ),
      },
    });
    res.json(rowToJson(row));
  } catch (e) {
    console.error(e);
    res.status(404).json({ error: 'Not found' });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
