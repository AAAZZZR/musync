"use client";

import { useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/lib/stores/player-store";
import { getSeedTracksByMood } from "@/lib/server/actions/seed-tracks";
import { Pause, Play, SkipForward, Volume2, Music } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { Mood, Track } from "@/types/api";
import Link from "next/link";

export function PublicPlayer({
  moods,
  initialMood,
  isLoggedIn,
}: {
  moods: Mood[];
  initialMood: string;
  isLoggedIn: boolean;
}) {
  const [selectedMood, setSelectedMood] = useState(initialMood);
  const [loading, startTransition] = useTransition();

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const pause = usePlayerStore((s) => s.pause);
  const resume = usePlayerStore((s) => s.resume);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const audioUnlockRef = useRef(false);

  function unlockAudio() {
    // 在 user click context 裡播放一個空音頻來解鎖 audio context
    if (audioUnlockRef.current) return;
    const audio = document.querySelector("audio");
    if (audio) {
      audio.play().then(() => { audio.pause(); }).catch(() => {});
    }
    audioUnlockRef.current = true;
  }

  function handleMoodSelect(mood: string) {
    unlockAudio();
    setSelectedMood(mood);
    startTransition(async () => {
      const tracks = await getSeedTracksByMood(mood);
      if (tracks.length > 0) {
        const randomIndex = Math.floor(Math.random() * tracks.length);
        usePlayerStore.getState().playTrack(tracks[randomIndex]);
        const rest = tracks.filter((_, i) => i !== randomIndex);
        if (rest.length > 0) {
          usePlayerStore.getState().enqueue(rest);
        }
      }
    });
  }

  function handleNext() {
    startTransition(async () => {
      const queue = usePlayerStore.getState().queue;
      if (queue.length > 0) {
        await usePlayerStore.getState().next();
      } else {
        // queue 空了，重新拿同 mood 的 tracks
        const tracks = await getSeedTracksByMood(selectedMood);
        if (tracks.length > 0) {
          const randomIndex = Math.floor(Math.random() * tracks.length);
          usePlayerStore.getState().playTrack(tracks[randomIndex]);
        }
      }
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="font-serif text-xl font-semibold">
          MuSync
        </Link>
        <nav className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link href="/app/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link href="/app/settings">
                <Button variant="ghost">Settings</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link href="/signup">
                <Button>Sign up</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Main content */}
      <main className="container flex flex-1 flex-col items-center justify-center gap-10 pb-32">
        <div className="text-center">
          <h1 className="font-serif text-4xl font-semibold">Pick a mood</h1>
          <p className="mt-2 text-muted-foreground">Select a mood and start listening.</p>
        </div>

        {/* Mood grid */}
        <div className="grid w-full max-w-2xl gap-3 md:grid-cols-3">
          {moods.map((m) => (
            <button
              key={m.key}
              onClick={() => handleMoodSelect(m.key)}
              disabled={loading}
              className={cn(
                "rounded-lg border px-5 py-4 text-left transition-all",
                selectedMood === m.key && currentTrack?.mood === m.key
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "hover:border-foreground/30 hover:shadow-sm",
              )}
            >
              <p className="font-serif text-lg font-semibold">{m.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
            </button>
          ))}
        </div>

        {/* Now playing */}
        {currentTrack ? (
          <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-xl border bg-card p-8 shadow-sm">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Music className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-serif text-lg font-semibold">{currentTrack.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{currentTrack.mood}</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                variant="outline"
                className="h-12 w-12 rounded-full"
                onClick={() => (isPlaying ? pause() : resume())}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={handleNext} disabled={loading}>
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>

            {/* Volume */}
            <div className="flex w-full max-w-[200px] items-center gap-3">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[volume]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => setVolume(v[0])}
              />
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <p>Click a mood to start playing</p>
          </div>
        )}

        {/* CTA for non-logged-in users */}
        {!isLoggedIn && currentTrack ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Want custom generated music?
            </p>
            <Link href="/signup">
              <Button className="mt-2">Sign up free</Button>
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}
