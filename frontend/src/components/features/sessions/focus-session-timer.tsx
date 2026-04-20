"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { completeFocusSessionAction } from "@/lib/server/actions/focus-session";

function formatRemaining(sec: number): string {
  if (sec <= 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FocusSessionTimer({
  sessionId,
  title,
  mood,
  startedAt,
  durationMinutes,
}: {
  sessionId: string;
  title: string;
  mood: string;
  startedAt: string;
  durationMinutes: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const endsAt = new Date(startedAt).getTime() + durationMinutes * 60_000;
  const [remaining, setRemaining] = useState<number>(
    Math.max(0, Math.floor((endsAt - Date.now()) / 1000)),
  );
  const [autoCompleting, setAutoCompleting] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => {
      const left = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !autoCompleting) {
        setAutoCompleting(true);
        complete(true);
      }
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, autoCompleting]);

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

  const total = durationMinutes * 60;
  const elapsed = total - remaining;
  const progress = total > 0 ? Math.min(elapsed / total, 1) : 0;

  return (
    <Card className="grid gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Focus session in progress</p>
          <p className="mt-1 font-serif text-2xl font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{mood}</p>
        </div>
        <div className="text-right">
          <p className="font-serif text-4xl font-semibold tabular-nums">
            {formatRemaining(remaining)}
          </p>
          <p className="text-xs text-muted-foreground">
            remaining of {durationMinutes} min
          </p>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => complete(false)} disabled={pending}>
          <Square className="mr-1 h-3 w-3" />
          End session
        </Button>
      </div>
    </Card>
  );
}
