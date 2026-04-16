import { ComposerForm } from "@/components/features/composer/composer-form";
import { PlayerStage } from "@/components/player/player-stage";
import { serverFetch } from "@/lib/server/api";
import { requireUser } from "@/lib/server/auth";
import type { Mood, Profile } from "@/types/api";

export default async function PlayPage() {
  await requireUser();
  const [moods, profile] = await Promise.all([
    serverFetch<Mood[]>("/api/catalog/moods"),
    serverFetch<Profile>("/api/profile"),
  ]);
  return (
    <div className="grid gap-6">
      <PlayerStage />
      <div>
        <h1 className="text-2xl font-semibold">Composer</h1>
        <p className="text-sm text-muted-foreground">Pick a mood, write a prompt, generate.</p>
      </div>
      <ComposerForm moods={moods} defaultMood={profile.preferred_mood} />
    </div>
  );
}
