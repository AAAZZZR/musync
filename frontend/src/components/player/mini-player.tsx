"use client";

import { Music } from "lucide-react";
import { usePlayerStore } from "@/lib/stores/player-store";
import { PlayerControls } from "./player-controls";

export function MiniPlayer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 backdrop-blur">
      <div className="container flex h-20 items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
          <Music className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium">{currentTrack?.title ?? "Nothing playing"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {currentTrack?.prompt ?? "Generate or pick a track to start."}
          </p>
        </div>
        <PlayerControls />
      </div>
    </div>
  );
}
