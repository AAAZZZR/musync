import { notFound } from "next/navigation";
import { Globe, Music } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrackCard } from "@/components/player/track-card";
import { ApiError, serverFetch } from "@/lib/server/api";
import type { CreatorProfile } from "@/types/api";

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let creator: CreatorProfile;
  try {
    creator = await serverFetch<CreatorProfile>(`/api/creators/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  return (
    <div className="grid max-w-4xl gap-8">
      <Card className="flex items-center gap-6 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Globe className="h-7 w-7 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-semibold">{creator.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            <Music className="mr-1 inline h-3 w-3" />
            {creator.total_public_tracks} public{" "}
            {creator.total_public_tracks === 1 ? "track" : "tracks"}
          </p>
        </div>
        <Badge variant="outline">Creator</Badge>
      </Card>

      <section>
        <h2 className="mb-4 font-serif text-lg font-semibold">Public tracks</h2>
        <div className="grid gap-3">
          {creator.tracks.map((t) => (
            <TrackCard
              key={t.id}
              track={t}
              deletable={false}
              toggleable={false}
              creator={t.creator}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
