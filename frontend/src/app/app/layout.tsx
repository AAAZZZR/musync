import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AudioHost } from "@/components/player/audio-host";
import { MiniPlayer } from "@/components/player/mini-player";
import { requireProfile } from "@/lib/server/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  if (!profile.onboarding_complete) redirect("/onboarding");
  return (
    <AppShell email={profile.email}>
      {children}
      <AudioHost />
      <MiniPlayer />
    </AppShell>
  );
}
