import Link from "next/link";
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/features/empty-state";
import { serverFetch } from "@/lib/server/api";
import { requireUser } from "@/lib/server/auth";
import type { FocusSession, Profile, Track } from "@/types/api";

export default async function DashboardPage() {
  await requireUser();
  const [profile, sessions, tracks] = await Promise.all([
    serverFetch<Profile>("/api/profile"),
    serverFetch<FocusSession[]>("/api/focus-sessions"),
    serverFetch<Track[]>("/api/library/tracks"),
  ]);

  const active = sessions.find((s) => s.status === "active");
  const todayMin = sessions
    .filter((s) => s.status === "completed" && s.completed_at?.startsWith(new Date().toISOString().slice(0, 10)))
    .reduce((acc, s) => acc + s.duration_minutes, 0);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {profile.full_name}</h1>
        <p className="text-sm text-muted-foreground">Today: {todayMin} / {profile.daily_focus_minutes} focus minutes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Active session</h2>
          {active ? (
            <p className="mt-2 font-medium">{active.title} &middot; {active.duration_minutes} min</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No active session</p>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Library size</h2>
          <p className="mt-2 text-2xl font-semibold">{tracks.length}</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Total sessions</h2>
          <p className="mt-2 text-2xl font-semibold">{sessions.length}</p>
        </Card>
      </div>

      {tracks.length === 0 ? (
        <EmptyState
          icon={<Music className="h-6 w-6" />}
          title="No tracks yet"
          description="Generate your first track from the Play page."
          action={<Link href="/app/play"><Button>Open Composer</Button></Link>}
        />
      ) : null}
    </div>
  );
}
