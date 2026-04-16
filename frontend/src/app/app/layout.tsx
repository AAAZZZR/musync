import { AppShell } from "@/components/layout/app-shell";
import { AudioHost } from "@/components/player/audio-host";
import { MiniPlayer } from "@/components/player/mini-player";
import { requireProfile } from "@/lib/server/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  return (
    <AppShell profile={profile}>
      {children}
      <AudioHost />
      <MiniPlayer />
    </AppShell>
  );
}
