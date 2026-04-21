"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  abandonFocusSessionAction,
  completeFocusSessionAction,
  pauseFocusSessionAction,
  resumeFocusSessionAction,
} from "@/lib/server/actions/focus-session";

function formatRemaining(sec: number): string {
  if (sec <= 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Status = "active" | "paused";

export function FocusSessionTimer({
  sessionId,
  title,
  mood,
  status,
  startedAt,
  durationMinutes,
  pausedAt,
  totalPausedSeconds,
}: {
  sessionId: string;
  title: string;
  mood: string;
  status: Status;
  startedAt: string;
  durationMinutes: number;
  pausedAt: string | null;
  totalPausedSeconds: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [autoCompleting, setAutoCompleting] = useState(false);

  // 有效開始時間 = started_at；實際經過 = (now - started_at) - total_paused_seconds
  const [remaining, setRemaining] = useState<number>(() =>
    computeRemaining(startedAt, durationMinutes, status, pausedAt, totalPausedSeconds),
  );

  useEffect(() => {
    if (status === "paused") {
      // 暫停時不動 timer（保持當下 remaining）
      return;
    }
    const tick = setInterval(() => {
      const left = computeRemaining(
        startedAt,
        durationMinutes,
        status,
        pausedAt,
        totalPausedSeconds,
      );
      setRemaining(left);
      if (left <= 0 && !autoCompleting) {
        setAutoCompleting(true);
        complete(true);
      }
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, durationMinutes, status, pausedAt, totalPausedSeconds, autoCompleting]);

  function complete(auto: boolean) {
    startTransition(async () => {
      const r = await completeFocusSessionAction(sessionId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(auto ? `Session "${title}" complete` : `Session ended`);
      router.refresh();
    });
  }

  function handlePause() {
    startTransition(async () => {
      const r = await pauseFocusSessionAction(sessionId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      router.refresh();
    });
  }

  function handleResume() {
    startTransition(async () => {
      const r = await resumeFocusSessionAction(sessionId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      router.refresh();
    });
  }

  function handleAbandon() {
    if (!confirm("Abandon this focus session? Progress so far will be kept.")) return;
    startTransition(async () => {
      const r = await abandonFocusSessionAction(sessionId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Session abandoned");
      router.refresh();
    });
  }

  const total = durationMinutes * 60;
  const elapsed = total - remaining;
  const progress = total > 0 ? Math.min(elapsed / total, 1) : 0;
  const paused = status === "paused";

  return (
    <Card className={cn("grid gap-4 p-6", paused && "opacity-80")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Focus session {paused ? "paused" : "in progress"}
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{mood}</p>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "font-serif text-4xl font-semibold tabular-nums",
              paused && "text-muted-foreground",
            )}
          >
            {formatRemaining(remaining)}
          </p>
          <p className="text-xs text-muted-foreground">remaining of {durationMinutes} min</p>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all", paused ? "bg-muted-foreground/60" : "bg-primary")}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {paused ? (
          <Button size="sm" onClick={handleResume} disabled={pending}>
            <Play className="mr-1 h-3 w-3" />
            Resume
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={handlePause} disabled={pending}>
            <Pause className="mr-1 h-3 w-3" />
            Pause
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => complete(false)} disabled={pending}>
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Complete
        </Button>
        <Button size="sm" variant="ghost" onClick={handleAbandon} disabled={pending}>
          <Square className="mr-1 h-3 w-3" />
          Abandon
        </Button>
      </div>
    </Card>
  );
}

function computeRemaining(
  startedAt: string,
  durationMinutes: number,
  status: Status,
  pausedAt: string | null,
  totalPausedSeconds: number,
): number {
  const now = Date.now();
  const started = new Date(startedAt).getTime();
  const currentPauseSec =
    status === "paused" && pausedAt ? Math.max(0, (now - new Date(pausedAt).getTime()) / 1000) : 0;
  const effectiveElapsedSec = Math.max(0, (now - started) / 1000 - totalPausedSeconds - currentPauseSec);
  return Math.max(0, Math.floor(durationMinutes * 60 - effectiveElapsedSec));
}
