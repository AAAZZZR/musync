import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const MOODS = ["focus", "calm", "sleep", "rainy", "happy_chill", "night_drive"] as const;
const LABELS: Record<string, string> = {
  focus: "Focus",
  calm: "Calm",
  sleep: "Sleep",
  rainy: "Rainy",
  happy_chill: "Happy Chill",
  night_drive: "Night Drive",
};

async function main() {
  for (const mood of MOODS) {
    for (let i = 1; i <= 6; i++) {
      await prisma.seedTrack.upsert({
        where: { id: `${mood}_seed_${i}` },
        update: {},
        create: {
          id: `${mood}_seed_${i}`,
          mood,
          title: `${LABELS[mood]} Seed ${i}`,
          prompt: `Seed loop for ${mood}`,
          streamUrl: "https://samplelib.com/lib/preview/mp3/sample-3s.mp3",
          durationSec: 180,
          sortOrder: i,
        },
      });
    }
  }
  console.log("Seeded 36 seed tracks (6 moods × 6 each)");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
