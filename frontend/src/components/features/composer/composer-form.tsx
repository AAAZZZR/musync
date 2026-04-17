"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoodPicker } from "./mood-picker";
import { createGenerationJobAction } from "@/lib/server/actions/generation";
import { createFocusSessionAction } from "@/lib/server/actions/focus-session";
import { startPlaybackAction } from "@/lib/server/actions/playback";
import { usePlayerStore } from "@/lib/stores/player-store";
import type { Mood } from "@/types/api";

export function ComposerForm({ moods, defaultMood }: { moods: Mood[]; defaultMood: string }) {
  const [mood, setMood] = useState(defaultMood);
  const [title, setTitle] = useState("Deep work block");
  const [minutes, setMinutes] = useState(50);
  const [prompt, setPrompt] = useState("warm vinyl, soft piano, no vocal");
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const r = await createGenerationJobAction({
        mood,
        prompt,
        duration_sec: 60,
        title,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.data.track) {
        usePlayerStore.getState().playTrack(r.data.track);
        toast.success(`Generated ${r.data.track.title}`);
      }
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
      if (!r.ok) toast.error(r.error);
      else toast.success(`Focus session "${r.data.title}" started`);
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
      usePlayerStore.getState().playTrack(r.data.track);
    });
  }

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

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleGenerate} disabled={pending}>
          Generate music
        </Button>
        <Button variant="outline" onClick={handleStartSession} disabled={pending}>
          Start focus session
        </Button>
        <Button variant="outline" onClick={handleStartPlayback} disabled={pending}>
          Start playback
        </Button>
      </div>
    </div>
  );
}
