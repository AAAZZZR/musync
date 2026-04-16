import { LibraryGrid } from "@/components/features/library/library-grid";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/server/auth";

export default async function LibraryPage() {
  const profile = await requireProfile();
  const dbTracks = await prisma.track.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  const tracks = dbTracks.map((t) => ({
    id: t.id,
    title: t.title,
    mood: t.mood,
    prompt: t.prompt,
    stream_url: t.streamUrl,
    duration_sec: t.durationSec,
    source: t.source,
    created_at: t.createdAt.toISOString(),
  }));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="text-sm text-muted-foreground">{tracks.length} generated tracks</p>
      </div>
      <LibraryGrid tracks={tracks} />
    </div>
  );
}
