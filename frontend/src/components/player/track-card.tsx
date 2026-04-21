"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Globe, Lock, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlayerStore } from "@/lib/stores/player-store";
import {
  deleteTrackAction,
  publishTrackAction,
  unpublishTrackAction,
} from "@/lib/server/actions/track";
import type { Track } from "@/types/api";

export function TrackCard({
  track,
  deletable = true,
  toggleable = true,
  creator,
}: {
  track: Track;
  deletable?: boolean;
  toggleable?: boolean;
  creator?: string;
}) {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id);
  const stop = usePlayerStore((s) => s.stop);
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [isPublic, setIsPublic] = useState<boolean>(!!track.is_public);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      const r = await deleteTrackAction(track.id);
      if (!r.ok) {
        toast.error(r.error);
        setConfirming(false);
        return;
      }
      if (currentTrackId === track.id) stop();
      toast.success(`Deleted ${track.title}`);
      setConfirming(false);
    });
  }

  function handleTogglePublic() {
    startTransition(async () => {
      const r = isPublic
        ? await unpublishTrackAction(track.id)
        : await publishTrackAction(track.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setIsPublic(r.data.isPublic);
      toast.success(r.data.isPublic ? `Published ${track.title}` : `Made private`);
    });
  }

  return (
    <Card className="flex items-center gap-4 p-4">
      <Button size="icon" onClick={() => playTrack(track)} aria-label="Play">
        <Play className="h-4 w-4" />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{track.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {creator ? (
            <>
              <Link
                href={`/app/creators/${track.profile_id}`}
                className="hover:text-foreground hover:underline"
              >
                {creator}
              </Link>{" "}
              ·{" "}
            </>
          ) : null}
          {track.prompt}
        </p>
      </div>
      <Badge variant="outline">{track.mood}</Badge>
      {isPublic && <Badge>Public</Badge>}
      <span className="text-xs text-muted-foreground">{track.duration_sec}s</span>

      {toggleable && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleTogglePublic}
          disabled={pending}
          aria-label={isPublic ? "Make private" : "Publish"}
          title={isPublic ? "Make private" : "Publish"}
        >
          {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </Button>
      )}

      {deletable && (
        <Button
          size="sm"
          variant={confirming ? "destructive" : "ghost"}
          onClick={handleDelete}
          disabled={pending}
          aria-label={confirming ? "Confirm delete" : "Delete"}
        >
          <Trash2 className="h-4 w-4" />
          {confirming && <span className="ml-1 text-xs">Confirm?</span>}
        </Button>
      )}
    </Card>
  );
}
