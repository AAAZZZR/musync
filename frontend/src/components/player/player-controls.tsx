"use client";

import { Pause, Play, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/lib/stores/player-store";

export function PlayerControls() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const pause = usePlayerStore((s) => s.pause);
  const resume = usePlayerStore((s) => s.resume);
  const next = usePlayerStore((s) => s.next);
  const setVolume = usePlayerStore((s) => s.setVolume);

  return (
    <div className="flex items-center gap-3">
      <Button size="icon" variant="ghost" onClick={() => (isPlaying ? pause() : resume())}>
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Button size="icon" variant="ghost" onClick={() => next()}>
        <SkipForward className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <Slider
          className="w-28"
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
