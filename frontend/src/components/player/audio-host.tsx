"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { usePlayerStore } from "@/lib/stores/player-store";
import { nextTrackAction } from "@/lib/server/actions/playback";
import { getStreamUrlAction } from "@/lib/server/actions/stream";
import { seedToTrack } from "@/lib/tracks";

export function AudioHost() {
  const ref = useRef<HTMLAudioElement>(null);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const playbackSessionId = usePlayerStore((s) => s.playbackSessionId);
  const queue = usePlayerStore((s) => s.queue);
  const seekTargetSec = usePlayerStore((s) => s.seekTargetSec);
  const loopCurrent = usePlayerStore((s) => s.loopCurrent);

  const [signedUrl, setSignedUrl] = useState<{ trackId: string; url: string } | null>(null);
  const userInteractedRef = useRef(false);

  useEffect(() => {
    function markInteracted() {
      userInteractedRef.current = true;
    }
    document.addEventListener("click", markInteracted, { once: true });
    document.addEventListener("keydown", markInteracted, { once: true });
    return () => {
      document.removeEventListener("click", markInteracted);
      document.removeEventListener("keydown", markInteracted);
    };
  }, []);

  // 當 currentTrack 切換到新 id 時，拉對應的 signed URL
  useEffect(() => {
    if (!currentTrack) return;
    if (signedUrl?.trackId === currentTrack.id) return;

    let cancelled = false;
    const kind = currentTrack.source === "seed" ? "seed" : "track";
    (async () => {
      const r = await getStreamUrlAction(kind, currentTrack.id);
      if (cancelled) return;
      if (!r.ok) {
        console.error("getStreamUrl failed:", r.error);
        if (r.error.toLowerCase().includes("exceeds your plan")) {
          toast.error("This track needs a Pro plan to play — upgrade in Settings → Billing.");
        } else {
          toast.error(`Cannot play: ${r.error}`);
        }
        usePlayerStore.getState().stop();
        return;
      }
      setSignedUrl({ trackId: currentTrack.id, url: r.data.url });
    })();

    return () => {
      cancelled = true;
    };
  }, [currentTrack, signedUrl?.trackId]);

  // 把 audio element 與 store 狀態同步
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!currentTrack) {
      el.pause();
      el.removeAttribute("src");
      return;
    }

    const url = signedUrl?.trackId === currentTrack.id ? signedUrl.url : null;
    if (!url) return;

    if (el.src !== url) el.src = url;
    el.volume = volume / 100;

    if (isPlaying) {
      if (userInteractedRef.current) el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [currentTrack, signedUrl, isPlaying, volume]);

  // Seek target
  useEffect(() => {
    const el = ref.current;
    if (!el || seekTargetSec == null) return;
    if (isFinite(seekTargetSec)) el.currentTime = seekTargetSec;
    usePlayerStore.getState().clearSeek();
  }, [seekTargetSec]);

  // Time / duration 回寫 store
  const handleTimeUpdate = useCallback(() => {
    const el = ref.current;
    if (el) usePlayerStore.getState().setProgress(el.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const el = ref.current;
    if (el && isFinite(el.duration)) {
      usePlayerStore.getState().setDuration(el.duration);
    }
  }, []);

  const handleEnded = useCallback(async () => {
    const el = ref.current;
    if (loopCurrent && el) {
      el.currentTime = 0;
      el.play().catch(() => {});
      return;
    }
    if (queue.length > 0) {
      await usePlayerStore.getState().next();
      return;
    }
    if (!playbackSessionId) return;
    const result = await nextTrackAction(playbackSessionId);
    if (result.ok) usePlayerStore.getState().playTrack(seedToTrack(result.data.track));
  }, [queue, playbackSessionId, loopCurrent]);

  return (
    <audio
      ref={ref}
      onEnded={handleEnded}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      preload="auto"
    />
  );
}
