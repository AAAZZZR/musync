"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/features/empty-state";
import { SessionStatusBadge } from "./session-status-badge";
import { completeFocusSessionAction } from "@/lib/server/actions/focus-session";
import type { FocusSession } from "@/types/api";

export function SessionList({ sessions }: { sessions: FocusSession[] }) {
  const [pending, startTransition] = useTransition();

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No focus sessions yet"
        description="Start your first focus session from the Play page."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {sessions.map((s) => (
        <Card key={s.id} className="flex items-center gap-4 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{s.title}</p>
            <p className="text-xs text-muted-foreground">
              {s.mood} &middot; {s.duration_minutes} min &middot; started {new Date(s.started_at).toLocaleString()}
            </p>
          </div>
          <SessionStatusBadge status={s.status} />
          {s.status === "active" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await completeFocusSessionAction(s.id);
                  if (!r.ok) toast.error(r.error);
                  else toast.success(`Completed "${r.data.title}"`);
                })
              }
            >
              Complete
            </Button>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
