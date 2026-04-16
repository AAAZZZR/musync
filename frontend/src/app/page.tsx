"use client";

import { useMemo, useRef, useState } from "react";

type MoodKey = "focus" | "calm" | "sleep" | "rainy" | "happy_chill" | "night_drive";

type Track = {
  id: string;
  stream_url: string;
  duration_sec: number;
};

type SessionResponse = {
  session_id: string;
  track: Track;
};

const MOODS: Array<{ key: MoodKey; label: string; desc: string }> = [
  { key: "focus", label: "Focus", desc: "Deep concentration" },
  { key: "calm", label: "Calm", desc: "Slow and relaxed" },
  { key: "sleep", label: "Sleep", desc: "Low energy bedtime" },
  { key: "rainy", label: "Rainy", desc: "Rain texture vibe" },
  { key: "happy_chill", label: "Happy Chill", desc: "Warm and bright" },
  { key: "night_drive", label: "Night Drive", desc: "Late-night cruising" },
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export default function HomePage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [mood, setMood] = useState<MoodKey>("focus");
  const [prompt, setPrompt] = useState("warm vinyl, soft piano, no vocal");
  const [status, setStatus] = useState("Ready");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const promptCount = useMemo(() => prompt.length, [prompt]);

  const startPlayback = async () => {
    setStatus("Starting session...");
    const response = await fetch(`${API_BASE}/api/play/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, prompt }),
    });

    if (!response.ok) {
      setStatus("Failed to start playback.");
      return;
    }

    const data: SessionResponse = await response.json();
    setSessionId(data.session_id);
    setCurrentTrack(data.track);

    if (!audioRef.current) return;
    audioRef.current.src = data.track.stream_url;
    await audioRef.current.play();
    setIsPlaying(true);
    setStatus(`Playing ${data.track.id}`);
  };

  const queueNext = async () => {
    if (!sessionId) return;
    const response = await fetch(`${API_BASE}/api/play/next`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (!response.ok) {
      setStatus("No next track yet.");
      return;
    }

    const data: { track: Track } = await response.json();
    setCurrentTrack(data.track);
    if (!audioRef.current) return;
    audioRef.current.src = data.track.stream_url;
    await audioRef.current.play();
    setStatus(`Playing ${data.track.id}`);
  };

  return (
    <main>
      <h1>MuSync MVP</h1>
      <p>Mood + Prompt controlled endless Lo-fi stream.</p>

      <section className="card">
        <h2>1) Mood</h2>
        <div className="grid">
          {MOODS.map((item) => (
            <button
              key={item.key}
              className={`mood-btn ${mood === item.key ? "active" : ""}`}
              onClick={() => setMood(item.key)}
              type="button"
            >
              <strong>{item.label}</strong>
              <br />
              <small>{item.desc}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>2) Prompt Bar</h2>
        <textarea
          value={prompt}
          maxLength={180}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="warm vinyl, soft keys, rainy night, no vocal"
        />
        <small>{promptCount}/180</small>
      </section>

      <section className="card">
        <h2>3) Playback</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={startPlayback} type="button">
            Start
          </button>
          <button className="secondary" onClick={queueNext} type="button">
            Next track
          </button>
          <button
            className="secondary"
            onClick={() => {
              if (!audioRef.current) return;
              audioRef.current.pause();
              setIsPlaying(false);
              setStatus("Paused");
            }}
            type="button"
          >
            Pause
          </button>
        </div>
        <p>Status: {status}</p>
        <p>Now playing: {currentTrack?.id ?? "-"}</p>
        <p>Playback: {isPlaying ? "on" : "off"}</p>
        <audio ref={audioRef} preload="auto" onEnded={queueNext} />
      </section>
    </main>
  );
}
