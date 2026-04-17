import Link from "next/link";
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/features/empty-state";
import { TrackCard } from "@/components/player/track-card";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/server/auth";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const [sessions, tracks] = await Promise.all([
    prisma.focusSession.findMany({
      where: { profileId: profile.id },
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
    prisma.track.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const active = sessions.find((s) => s.status === "active");
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMin = sessions
    .filter((s) => s.status === "completed" && s.completedAt?.toISOString().startsWith(todayStr))
    .reduce((acc, s) => acc + s.durationMinutes, 0);

  return (
    <div className="grid gap-8">
      {/* Overview */}
      <div>
        <h1 className="font-serif text-2xl font-semibold">Welcome back, {profile.fullName}</h1>
        <p className="text-sm text-muted-foreground">
          Today: {todayMin} / {profile.dailyFocusMinutes} focus minutes
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Active session</h2>
          {active ? (
            <p className="mt-2 font-medium">
              {active.title} &middot; {active.durationMinutes} min
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No active session</p>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Library</h2>
          <p className="mt-2 text-2xl font-semibold">{tracks.length} tracks</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Sessions</h2>
          <p className="mt-2 text-2xl font-semibold">{sessions.length} total</p>
        </Card>
      </div>

      {/* Library section */}
      <section>
        <h2 className="font-serif text-xl font-semibold">Library</h2>
        <p className="mb-4 text-sm text-muted-foreground">Your generated tracks</p>
        {tracks.length === 0 ? (
          <EmptyState
            icon={<Music className="h-6 w-6" />}
            title="No tracks yet"
            description="Generate your first track from the home page."
            action={
              <Link href="/">
                <Button>Go to Player</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3">
            {tracks.map((t) => (
              <TrackCard
                key={t.id}
                track={{
                  id: t.id,
                  title: t.title,
                  mood: t.mood,
                  prompt: t.prompt,
                  stream_url: t.streamUrl,
                  duration_sec: t.durationSec,
                  source: t.source,
                  created_at: t.createdAt.toISOString(),
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sessions section */}
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
                    {s.mood} &middot; {s.durationMinutes} min &middot;{" "}
                    {new Date(s.startedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={s.status === "active" ? "default" : s.status === "completed" ? "secondary" : "outline"}>
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
