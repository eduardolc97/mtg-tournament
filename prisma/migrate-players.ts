import { Prisma, PrismaClient } from '@prisma/client';
import { PRESET_PLAYER_NAMES } from '../src/app/data/presetPlayerNamesList';

const prisma = new PrismaClient();

function nicknameKey(nickname: string): string {
  return nickname.trim().toLowerCase();
}

async function deleteAllTournamentsIfPresent(): Promise<void> {
  try {
    await prisma.tournament.deleteMany();
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2021'
    ) {
      console.log('Tournaments table not found — skipping delete.');
      return;
    }
    throw e;
  }
}

async function main() {
  console.log('Deleting all tournaments (historical rounds discarded)...');
  await deleteAllTournamentsIfPresent();

  console.log('Seeding players from preset list...');
  for (const raw of PRESET_PLAYER_NAMES) {
    const nickname = raw.trim();
    const key = nicknameKey(nickname);
    if (!key) {
      continue;
    }
    await prisma.player.upsert({
      where: { nicknameKey: key },
      create: {
        nickname,
        nicknameKey: key,
      },
      update: {},
    });
  }

  console.log('Migration complete.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
