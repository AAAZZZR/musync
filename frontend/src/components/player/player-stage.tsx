"use client";

import { Music } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlayerStore } from "@/lib/stores/player-store";

export function PlayerStage() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-md bg-muted">
          <Music className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-lg font-semibold">{currentTrack?.title ?? "Nothing playing"}</p>
          <p className="text-sm text-muted-foreground">
            {currentTrack?.prompt ?? "Generate or pick a track."}
          </p>
        </div>
        {currentTrack ? <Badge variant="outline">{currentTrack.source}</Badge> : null}
      </div>
    </Card>
  );
}
