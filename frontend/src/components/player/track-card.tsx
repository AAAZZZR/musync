"use client";

import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlayerStore } from "@/lib/stores/player-store";
import type { Track } from "@/types/api";

export function TrackCard({ track }: { track: Track }) {
  const playTrack = usePlayerStore((s) => s.playTrack);
  return (
    <Card className="flex items-center gap-4 p-4">
      <Button size="icon" onClick={() => playTrack(track)}>
        <Play className="h-4 w-4" />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{track.title}</p>
        <p className="truncate text-xs text-muted-foreground">{track.prompt}</p>
      </div>
      <Badge variant="outline">{track.mood}</Badge>
      <span className="text-xs text-muted-foreground">{track.duration_sec}s</span>
    </Card>
  );
}
