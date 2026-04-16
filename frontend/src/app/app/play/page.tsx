import { ComposerForm } from "@/components/features/composer/composer-form";
import { PlayerStage } from "@/components/player/player-stage";
import { requireProfile } from "@/lib/server/auth";
import { MOODS } from "@/lib/constants/moods";

export default async function PlayPage() {
  const profile = await requireProfile();
  return (
    <div className="grid gap-6">
      <PlayerStage />
      <div>
        <h1 className="text-2xl font-semibold">Composer</h1>
        <p className="text-sm text-muted-foreground">Pick a mood, write a prompt, generate.</p>
      </div>
      <ComposerForm moods={MOODS} defaultMood={profile.preferredMood} />
    </div>
  );
}
