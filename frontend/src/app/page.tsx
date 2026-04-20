import { PublicPlayer } from "@/components/features/player/public-player";
import { AudioHost } from "@/components/player/audio-host";
import { MOODS } from "@/lib/constants/moods";
import { hasSession } from "@/lib/server/auth";

export default async function HomePage() {
  const isLoggedIn = await hasSession();

  return (
    <>
      <PublicPlayer moods={MOODS} initialMood="focus" isLoggedIn={isLoggedIn} />
      <AudioHost />
    </>
  );
}
