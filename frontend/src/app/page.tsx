import { PublicPlayer } from "@/components/features/player/public-player";
import { AudioHost } from "@/components/player/audio-host";
import { MOODS } from "@/lib/constants/moods";
import { getSupabaseUser } from "@/lib/server/auth";

export default async function HomePage() {
  const user = await getSupabaseUser();

  return (
    <>
      <PublicPlayer moods={MOODS} initialMood="focus" isLoggedIn={!!user} />
      <AudioHost />
    </>
  );
}
