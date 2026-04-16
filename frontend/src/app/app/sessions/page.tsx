import { SessionList } from "@/components/features/sessions/session-list";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/server/auth";

export default async function SessionsPage() {
  const profile = await requireProfile();
  const dbSessions = await prisma.focusSession.findMany({
    where: { profileId: profile.id },
    orderBy: { startedAt: "desc" },
  });

  const sessions = dbSessions.map((s) => ({
    id: s.id,
    user_id: s.profileId,
    title: s.title,
    mood: s.mood,
    duration_minutes: s.durationMinutes,
    prompt: s.prompt,
    status: s.status as "active" | "completed" | "abandoned",
    started_at: s.startedAt.toISOString(),
    completed_at: s.completedAt?.toISOString() ?? null,
  }));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Focus Sessions</h1>
        <p className="text-sm text-muted-foreground">{sessions.length} total</p>
      </div>
      <SessionList sessions={sessions} />
    </div>
  );
}
