import Link from "next/link";
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/features/empty-state";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/server/auth";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const [sessions, tracks] = await Promise.all([
    prisma.focusSession.findMany({
      where: { profileId: profile.id },
      orderBy: { startedAt: "desc" },
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
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {profile.fullName}</h1>
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
          action={
            <Link href="/app/play">
              <Button>Open Composer</Button>
            </Link>
          }
        />
      ) : null}
    </div>
  );
}
