import Link from "next/link";
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/features/empty-state";
import { TrackCard } from "@/components/player/track-card";
import type { Track } from "@/types/api";

export function LibraryGrid({ tracks }: { tracks: Track[] }) {
  if (tracks.length === 0) {
    return (
      <EmptyState
        icon={<Music className="h-6 w-6" />}
        title="No tracks yet"
        description="Generate your first track from the Play page."
        action={<Link href="/app/play"><Button>Open Composer</Button></Link>}
      />
    );
  }
  return (
    <div className="grid gap-3">
      {tracks.map((t) => <TrackCard key={t.id} track={t} />)}
    </div>
  );
}
