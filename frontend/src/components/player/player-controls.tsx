"use client";

import { Pause, Play, Repeat, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/lib/stores/player-store";
import { cn } from "@/lib/utils";

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayerControls({ compact = false }: { compact?: boolean }) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const progressSec = usePlayerStore((s) => s.progressSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const historyCount = usePlayerStore((s) => s.history.length);
  const loopCurrent = usePlayerStore((s) => s.loopCurrent);
  const pause = usePlayerStore((s) => s.pause);
  const resume = usePlayerStore((s) => s.resume);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const toggleLoop = usePlayerStore((s) => s.toggleLoop);
  const setVolume = usePlayerStore((s) => s.setVolume);

  return (
    <div className={cn("flex items-center gap-3", compact && "gap-2")}>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => previous()}
        disabled={historyCount === 0}
        aria-label="Previous"
      >
        <SkipBack className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => (isPlaying ? pause() : resume())}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Button size="icon" variant="ghost" onClick={() => next()} aria-label="Next">
        <SkipForward className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant={loopCurrent ? "secondary" : "ghost"}
        onClick={() => toggleLoop()}
        aria-label="Loop"
        title={loopCurrent ? "Loop on" : "Loop off"}
      >
        <Repeat className="h-4 w-4" />
      </Button>

      {!compact && (
        <div className="flex min-w-[180px] items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{formatTime(progressSec)}</span>
          <Slider
            className="flex-1"
            value={[durationSec > 0 ? (progressSec / durationSec) * 100 : 0]}
            min={0}
            max={100}
            step={0.1}
            onValueChange={(v) => {
              if (durationSec > 0) seekTo((v[0] / 100) * durationSec);
            }}
          />
          <span className="tabular-nums">{formatTime(durationSec)}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <Slider
          className="w-24"
          value={[volume]}
          min={0}
          max={100}
          step={1}
          onValueChange={(v) => setVolume(v[0])}
        />
      </div>
    </div>
  );
}
