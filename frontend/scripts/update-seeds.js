const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const updates = [
  { id: "focus_seed_1", file: "57f5eddd-5fd2-577b-c395-4adf9158912f.wav" },
  { id: "focus_seed_2", file: "5e29463e-8c68-9d04-5ed0-9779d271dd94.wav" },
  { id: "focus_seed_3", file: "b98ef341-7344-b283-bde5-7fd5a08c373c.wav" },
  { id: "focus_seed_4", file: "a28bfece-0458-fabd-5841-8e7feab44785.wav" },
  { id: "focus_seed_5", file: "f5f1df2e-1423-dbff-28ee-979dff4467ad.wav" },
  { id: "focus_seed_6", file: "ee9c059b-b48b-1767-1b4b-5ee65156a2f1.wav" },
  { id: "calm_seed_1", file: "3c999007-9a94-5003-b49f-fb938842851f.wav" },
  { id: "calm_seed_2", file: "930cc245-4c0c-8910-77cb-9c3b99963fdc.wav" },
  { id: "calm_seed_3", file: "02aeee31-1e1d-a9a5-682a-3415ecf55fe5.wav" },
  { id: "calm_seed_4", file: "628e02d2-3cfc-d0a6-02fc-33c94f99f4d8.wav" },
  { id: "calm_seed_5", file: "4dc293d1-e7fc-1afd-538b-dade5582704b.wav" },
  { id: "calm_seed_6", file: "dcdaf24a-848c-1142-dffe-fcae5739e0ed.wav" },
  { id: "sleep_seed_1", file: "849bded1-992d-9f9b-93c5-ec91783ac1b6.wav" },
  { id: "sleep_seed_2", file: "c762f398-365d-d039-cea0-3504a6a56232.wav" },
  { id: "sleep_seed_3", file: "ed8dbbea-6982-e2b4-74d2-76be561273c8.wav" },
  { id: "sleep_seed_4", file: "82b4cb66-67ba-d494-f130-397a3a6c9c38.wav" },
  { id: "sleep_seed_5", file: "b4df97df-b740-7939-649f-1689cb6fd01e.wav" },
  { id: "sleep_seed_6", file: "cf3d4906-fdef-d23e-a189-5f120ff555d5.wav" },
  { id: "rainy_seed_1", file: "da7268a2-5b06-8719-630d-300f4d2ccdef.wav" },
  { id: "rainy_seed_2", file: "da7268a2-5b06-8719-630d-300f4d2ccdef.wav" }, // copied from rainy_1
  { id: "rainy_seed_3", file: "ca25d141-55d4-15e2-c790-0ee28bba4d16.wav" },
  { id: "rainy_seed_4", file: "4a88eb30-62a8-2332-5df1-3fa58916aa82.wav" },
  { id: "rainy_seed_5", file: "12af1004-27de-0594-246a-9d9ab1345f0a.wav" },
  { id: "rainy_seed_6", file: "3cd1c76d-244a-568d-0149-a414983a8a66.wav" },
  { id: "happy_chill_seed_1", file: "883dd2d1-5ce6-4459-ff2d-69663e25bf7e.wav" },
  { id: "happy_chill_seed_2", file: "4f2003f4-91ae-409b-c1e9-4210ec0da20c.wav" },
  { id: "happy_chill_seed_3", file: "328cfa3d-3283-d441-5ef1-f7ae7ef610eb.wav" },
  { id: "happy_chill_seed_4", file: "46177e19-a2c5-5e44-c7d8-c448bacc4798.wav" },
  { id: "happy_chill_seed_5", file: "3b9ef530-d9a8-af88-8ee0-205fa57784b2.wav" },
  { id: "happy_chill_seed_6", file: "b75a9211-7e1d-6711-790c-ffc8851a03c5.wav" },
  { id: "night_drive_seed_1", file: "ec5a4d9d-24e7-e058-6762-ff6317596e95.wav" },
  { id: "night_drive_seed_2", file: "e2e32a13-7227-e770-2663-4662231bdcc6.wav" },
  { id: "night_drive_seed_3", file: "8e7b0390-96d3-8e08-b255-e4a9fd141b38.wav" },
  { id: "night_drive_seed_4", file: "9953b6ce-051e-f4a7-1480-f9d151c8c850.wav" },
  { id: "night_drive_seed_5", file: "20c7135f-f50f-d43e-3112-b5a7dcc905ae.wav" },
  { id: "night_drive_seed_6", file: "f0f2d092-d8cb-666f-6890-8ff7bb065e43.wav" },
];

async function main() {
  for (const u of updates) {
    const filePath = `/workspace/ACE-Step-1.5/.cache/acestep/tmp/api_audio/${u.file}`;
    const streamUrl = `/api/audio?path=${encodeURIComponent(filePath)}`;
    await prisma.seedTrack.update({
      where: { id: u.id },
      data: { streamUrl, durationSec: 600 },
    });
    console.log(`${u.id}: updated`);
  }
  console.log("Done! 36 seed tracks updated with unique 10-min 1.7B tracks.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
