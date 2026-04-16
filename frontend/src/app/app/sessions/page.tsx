import { SessionList } from "@/components/features/sessions/session-list";
import { serverFetch } from "@/lib/server/api";
import type { FocusSession } from "@/types/api";

export default async function SessionsPage() {
  const sessions = await serverFetch<FocusSession[]>("/api/focus-sessions");
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
