import { AppShell } from "@/components/layout/app-shell";
import { AudioHost } from "@/components/player/audio-host";
import { MiniPlayer } from "@/components/player/mini-player";
import { requireUser } from "@/lib/server/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      {children}
      <AudioHost />
      <MiniPlayer />
    </AppShell>
  );
}
