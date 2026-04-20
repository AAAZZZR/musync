import { Globe } from "lucide-react";
import { EmptyState } from "@/components/features/empty-state";
import { TrackCard } from "@/components/player/track-card";
import { MoodFilter } from "@/components/features/community/mood-filter";
import { MOODS } from "@/lib/constants/moods";
import { listCommunityTracksAction } from "@/lib/server/actions/community";

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ mood?: string }>;
}) {
  const { mood } = await searchParams;
  const tracks = await listCommunityTracksAction({ mood });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Community</h1>
        <p className="text-sm text-muted-foreground">
          Public tracks shared by other MuSync users.
        </p>
      </div>

      <MoodFilter moods={MOODS} activeMood={mood} />

      {tracks.length === 0 ? (
        <EmptyState
          icon={<Globe className="h-6 w-6" />}
          title="No public tracks yet"
          description={
            mood
              ? `No community tracks for "${mood}" yet.`
              : "Be the first to publish one from your library."
          }
        />
      ) : (
        <div className="grid gap-3">
          {tracks.map((t) => (
            <TrackCard
              key={t.id}
              track={t}
              deletable={false}
              toggleable={false}
              creator={t.creator}
            />
          ))}
        </div>
      )}
    </div>
  );
}
