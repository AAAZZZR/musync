"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoodPicker } from "./mood-picker";
import {
  createGenerationJobAction,
  pollGenerationJobAction,
} from "@/lib/server/actions/generation";
import { createFocusSessionAction } from "@/lib/server/actions/focus-session";
import { startPlaybackAction } from "@/lib/server/actions/playback";
import { usePlayerStore } from "@/lib/stores/player-store";
import { seedToTrack } from "@/lib/tracks";
import type { Mood } from "@/types/api";

const GENERATION_DURATION_SEC = 60;
const POLL_INTERVAL_MS = 3000;
const PROGRESS_TICK_MS = 200;
const MAX_WAIT_MS = 5 * 60 * 1000;
const ESTIMATE_RATIO = 0.15;

type GenState =
  | { kind: "idle" }
  | { kind: "generating"; jobId: string; startedAt: number; estimatedMs: number };

export function ComposerForm({ moods, defaultMood }: { moods: Mood[]; defaultMood: string }) {
  const router = useRouter();
  const [mood, setMood] = useState(defaultMood);
  const [title, setTitle] = useState("Deep work block");
  const [minutes, setMinutes] = useState(50);
  const [prompt, setPrompt] = useState("warm vinyl, soft piano, no vocal");
  const [pending, startTransition] = useTransition();
  const [gen, setGen] = useState<GenState>({ kind: "idle" });
  const [progress, setProgress] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 進度條 tick（視覺推算）
  useEffect(() => {
    if (gen.kind !== "generating") return;
    const tick = setInterval(() => {
      const elapsed = Date.now() - gen.startedAt;
      setProgress(Math.min(elapsed / gen.estimatedMs, 0.95));
    }, PROGRESS_TICK_MS);
    return () => clearInterval(tick);
  }, [gen]);

  // Polling 迴圈
  useEffect(() => {
    if (gen.kind !== "generating") return;
    let cancelled = false;

    const poll = async () => {
      if (cancelled || !mountedRef.current) return;
      if (Date.now() - gen.startedAt > MAX_WAIT_MS) {
        toast.error("Generation timed out after 5 minutes");
        setGen({ kind: "idle" });
        setProgress(0);
        return;
      }
      const r = await pollGenerationJobAction(gen.jobId);
      if (cancelled || !mountedRef.current) return;

      if (!r.ok) {
        toast.error(r.error);
        setGen({ kind: "idle" });
        setProgress(0);
        return;
      }

      if (r.data.status === "completed" && r.data.track) {
        setProgress(1);
        usePlayerStore.getState().playTrack(r.data.track);
        toast.success(`Generated ${r.data.track.title}`);
        setTimeout(() => {
          if (mountedRef.current) {
            setGen({ kind: "idle" });
            setProgress(0);
          }
        }, 500);
        return;
      }

      setTimeout(poll, POLL_INTERVAL_MS);
    };

    const id = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [gen]);

  function handleGenerate() {
    if (gen.kind === "generating") return;
    startTransition(async () => {
      const r = await createGenerationJobAction({
        mood,
        prompt,
        duration_sec: GENERATION_DURATION_SEC,
        title,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setProgress(0);
      setGen({
        kind: "generating",
        jobId: r.data.jobId,
        startedAt: Date.now(),
        estimatedMs: r.data.durationSec * ESTIMATE_RATIO * 1000,
      });
    });
  }

  function handleStartSession() {
    startTransition(async () => {
      const r = await createFocusSessionAction({
        title,
        mood,
        duration_minutes: minutes,
        prompt,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      // 順便開始播放（當前沒在播時）
      if (!usePlayerStore.getState().currentTrack) {
        const p = await startPlaybackAction({ mood, prompt });
        if (p.ok) {
          usePlayerStore.getState().setPlaybackSession(p.data.session_id);
          usePlayerStore.getState().playTrack(seedToTrack(p.data.track));
        }
      }
      toast.success(`Focus session "${r.data.title}" started`);
      router.refresh();
    });
  }

  function handleStartPlayback() {
    startTransition(async () => {
      const r = await startPlaybackAction({ mood, prompt });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      usePlayerStore.getState().setPlaybackSession(r.data.session_id);
      usePlayerStore.getState().playTrack(seedToTrack(r.data.track));
    });
  }

  const generating = gen.kind === "generating";

  return (
    <div className="grid gap-6">
      <MoodPicker moods={moods} value={mood} onChange={setMood} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="title">Session title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="minutes">Minutes</Label>
          <Input
            id="minutes"
            type="number"
            min={5}
            max={180}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="prompt">Prompt</Label>
        <Textarea
          id="prompt"
          value={prompt}
          maxLength={180}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-28"
        />
      </div>

      {generating && (
        <div className="grid gap-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Generating music…</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-200 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleGenerate} disabled={pending || generating}>
          {generating ? "Generating…" : "Generate music"}
        </Button>
        <Button variant="outline" onClick={handleStartSession} disabled={pending || generating}>
          Start focus session
        </Button>
        <Button variant="outline" onClick={handleStartPlayback} disabled={pending || generating}>
          Start playback
        </Button>
      </div>
    </div>
  );
}
