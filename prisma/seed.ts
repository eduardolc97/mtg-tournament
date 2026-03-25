import { PrismaClient } from '@prisma/client';
import { PRESET_PLAYER_NAMES } from '../src/app/data/presetPlayerNamesList';

const prisma = new PrismaClient();

async function main() {
  await prisma.tournament.deleteMany({
    where: { id: 'mock-1' },
  });

  for (const name of PRESET_PLAYER_NAMES) {
    await prisma.presetPlayerName.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
