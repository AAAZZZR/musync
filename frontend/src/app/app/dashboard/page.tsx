import Link from "next/link";
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/features/empty-state";
import { TrackCard } from "@/components/player/track-card";
import { ComposerForm } from "@/components/features/composer/composer-form";
import { FocusSessionTimer } from "@/components/features/sessions/focus-session-timer";
import { MOODS } from "@/lib/constants/moods";
import { requireProfile } from "@/lib/server/auth";
import { serverFetch } from "@/lib/server/api";
import type { FocusSession, Track } from "@/types/api";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const [sessions, tracks] = await Promise.all([
    serverFetch<FocusSession[]>("/api/focus-sessions?limit=10"),
    serverFetch<Track[]>("/api/tracks"),
  ]);

  const active = sessions.find((s) => s.status === "active" || s.status === "paused");
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMin = sessions
    .filter((s) => s.status === "completed" && s.completed_at?.startsWith(todayStr))
    .reduce((acc, s) => acc + s.duration_minutes, 0);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Welcome back, {profile.full_name}</h1>
        <p className="text-sm text-muted-foreground">
          Today: {todayMin} / {profile.daily_focus_minutes} focus minutes
        </p>
      </div>

      {active && (
        <FocusSessionTimer
          sessionId={active.id}
          title={active.title}
          mood={active.mood}
          status={active.status as "active" | "paused"}
          startedAt={active.started_at}
          durationMinutes={active.duration_minutes}
          pausedAt={active.paused_at ?? null}
          totalPausedSeconds={active.total_paused_seconds ?? 0}
        />
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Tracks</h2>
          <p className="mt-2 text-2xl font-semibold">{tracks.length}</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Sessions</h2>
          <p className="mt-2 text-2xl font-semibold">{sessions.length}</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Plan</h2>
          <p className="mt-2 text-2xl font-semibold capitalize">{profile.plan}</p>
          <p className="text-xs text-muted-foreground">
            {tracks.length} / {profile.track_limit} tracks used
          </p>
        </Card>
      </div>

      <section>
        <h2 className="font-serif text-xl font-semibold">Compose</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Generate a custom track or start a focus session.
        </p>
        <Card className="p-6">
          <ComposerForm moods={MOODS} defaultMood={profile.preferred_mood} />
        </Card>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold">Library</h2>
        <p className="mb-4 text-sm text-muted-foreground">Your generated tracks</p>
        {tracks.length === 0 ? (
          <EmptyState
            icon={<Music className="h-6 w-6" />}
            title="No tracks yet"
            description="Use the composer above to generate your first track."
            action={
              <Link href="/">
                <Button variant="outline">Browse moods</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3">
            {tracks.map((t) => (
              <TrackCard key={t.id} track={t} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold">Focus Sessions</h2>
        <p className="mb-4 text-sm text-muted-foreground">Your session history</p>
        {sessions.length === 0 ? (
          <EmptyState title="No sessions yet" description="Start a focus session to track your progress." />
        ) : (
          <div className="grid gap-3">
            {sessions.map((s) => (
              <Card key={s.id} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.mood} &middot; {s.duration_minutes} min &middot;{" "}
                    {new Date(s.started_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  variant={
                    s.status === "active" ? "default" : s.status === "completed" ? "secondary" : "outline"
                  }
                >
                  {s.status}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
