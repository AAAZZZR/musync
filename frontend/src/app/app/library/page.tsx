import { LibraryGrid } from "@/components/features/library/library-grid";
import { serverFetch } from "@/lib/server/api";
import type { Track } from "@/types/api";

export default async function LibraryPage() {
  const tracks = await serverFetch<Track[]>("/api/library/tracks");
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
