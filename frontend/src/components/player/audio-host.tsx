"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "@/lib/stores/player-store";
import { nextTrackAction } from "@/lib/server/actions/playback";

export function AudioHost() {
  const ref = useRef<HTMLAudioElement>(null);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const playbackSessionId = usePlayerStore((s) => s.playbackSessionId);
  const queue = usePlayerStore((s) => s.queue);

  // 用 ref 追蹤是否由使用者互動觸發
  const userInteractedRef = useRef(false);

  // 首次互動後標記
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

  useEffect(() => {
    const el = ref.current;
    if (!el || !currentTrack) return;

    if (el.src !== currentTrack.stream_url) {
      el.src = currentTrack.stream_url;
    }

    el.volume = volume / 100;

    if (isPlaying) {
      // 只在使用者已互動過後才嘗試 play
      if (userInteractedRef.current) {
        el.play().catch(() => {
          // 如果還是被擋，靜默處理，使用者可以手動按 play
        });
      }
    } else {
      el.pause();
    }
  }, [currentTrack, isPlaying, volume]);

  const handleEnded = useCallback(async () => {
    if (queue.length > 0) {
      await usePlayerStore.getState().next();
      return;
    }
    if (!playbackSessionId) return;
    const result = await nextTrackAction(playbackSessionId);
    if (result.ok) usePlayerStore.getState().playTrack(result.data.track);
  }, [queue, playbackSessionId]);

  return <audio ref={ref} onEnded={handleEnded} preload="auto" />;
}
