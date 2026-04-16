"use client";

import { useEffect, useRef, useState } from "react";

import { AuthPanel } from "@/components/home/auth-panel";
import { DataListPanel } from "@/components/home/data-list-panel";
import { FocusComposer } from "@/components/home/focus-composer";
import { PlayerPanel } from "@/components/home/player-panel";
import { apiRequest, TOKEN_KEY } from "@/lib/api";
import type {
  AuthResponse,
  FocusSession,
  GenerationJob,
  Mood,
  Profile,
  StartPlaybackResponse,
  Track,
  User,
} from "@/types/app";

export function HomePage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("demo@musync.app");
  const [password, setPassword] = useState("focusflow123");
  const [fullName, setFullName] = useState("Focus Builder");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [selectedMood, setSelectedMood] = useState("focus");
  const [prompt, setPrompt] = useState("warm vinyl, soft piano, no vocal, steady concentration");
  const [sessionTitle, setSessionTitle] = useState("Deep work block");
  const [sessionMinutes, setSessionMinutes] = useState(50);
  const [playerSessionId, setPlayerSessionId] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [library, setLibrary] = useState<Track[]>([]);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [activeFocusSession, setActiveFocusSession] = useState<FocusSession | null>(null);
  const [status, setStatus] = useState("Load the app, create an account, and start a focus session.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void apiRequest<Mood[]>("/api/catalog/moods")
      .then((data) => {
        setMoods(data);
        if (data.length > 0) {
          setSelectedMood((current) => current || data[0].key);
        }
      })
      .catch(() => {
        setStatus("Backend mood catalog is unavailable.");
      });
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (stored) {
      setToken(stored);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setProfile(null);
      setLibrary([]);
      setJobs([]);
      setFocusSessions([]);
      setActiveFocusSession(null);
      window.localStorage.removeItem(TOKEN_KEY);
      return;
    }

    window.localStorage.setItem(TOKEN_KEY, token);
    void hydrateApp(token);
  }, [token]);

  async function hydrateApp(accessToken: string) {
    try {
      const [me, nextProfile, nextLibrary, nextJobs, nextSessions] = await Promise.all([
        apiRequest<User>("/api/auth/me", {}, accessToken),
        apiRequest<Profile>("/api/profile", {}, accessToken),
        apiRequest<Track[]>("/api/library/tracks", {}, accessToken),
        apiRequest<GenerationJob[]>("/api/generation/jobs", {}, accessToken),
        apiRequest<FocusSession[]>("/api/focus-sessions", {}, accessToken),
      ]);

      setUser(me);
      setProfile(nextProfile);
      setLibrary(nextLibrary);
      setJobs(nextJobs);
      setFocusSessions(nextSessions);
      setActiveFocusSession(nextSessions.find((item) => item.status === "active") ?? null);
      setSelectedMood(nextProfile.preferred_mood);
      setStatus(`Signed in as ${me.email}`);
    } catch (error) {
      setToken(null);
      setStatus(error instanceof Error ? error.message : "Session restore failed.");
    }
  }

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);

    try {
      const payload =
        authMode === "signup" ? { email, password, full_name: fullName } : { email, password };
      const data = await apiRequest<AuthResponse>(`/api/auth/${authMode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setToken(data.access_token);
      setStatus(authMode === "signup" ? "Account created." : "Logged in.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    if (!token) {
      return;
    }

    try {
      await apiRequest<{ message: string }>("/api/auth/logout", { method: "POST" }, token);
    } catch {
      // Ignore logout failures.
    }

    setToken(null);
    setPlayerSessionId(null);
    setCurrentTrack(null);
    setStatus("Logged out.");
  }

  async function startPlayback() {
    if (!token) {
      setStatus("Sign in before starting playback.");
      return;
    }

    setBusy(true);
    try {
      const data = await apiRequest<StartPlaybackResponse>(
        "/api/play/start",
        { method: "POST", body: JSON.stringify({ mood: selectedMood, prompt }) },
        token,
      );

      setPlayerSessionId(data.session_id);
      setCurrentTrack(data.track);

      if (audioRef.current) {
        audioRef.current.src = data.track.stream_url;
        audioRef.current.volume = (profile?.background_volume ?? 60) / 100;
        await audioRef.current.play();
      }

      setStatus(`Playing ${data.track.title}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Playback failed.");
    } finally {
      setBusy(false);
    }
  }

  async function playNextTrack() {
    if (!token || !playerSessionId) {
      setStatus("Start playback first.");
      return;
    }

    try {
      const data = await apiRequest<{ track: Track }>(
        "/api/play/next",
        { method: "POST", body: JSON.stringify({ session_id: playerSessionId }) },
        token,
      );
      setCurrentTrack(data.track);
      if (audioRef.current) {
        audioRef.current.src = data.track.stream_url;
        await audioRef.current.play();
      }
      setStatus(`Playing ${data.track.title}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not fetch next track.");
    }
  }

  async function createGeneration() {
    if (!token) {
      setStatus("Sign in before generating music.");
      return;
    }

    setBusy(true);
    try {
      const job = await apiRequest<GenerationJob>(
        "/api/generation/jobs",
        {
          method: "POST",
          body: JSON.stringify({
            mood: selectedMood,
            prompt,
            duration_sec: Math.max(sessionMinutes * 60, 180),
            title: sessionTitle,
          }),
        },
        token,
      );

      setJobs((current) => [job, ...current]);
      if (job.track) {
        setLibrary((current) => [job.track as Track, ...current]);
        setCurrentTrack(job.track);
      }
      setStatus(`Generated ${job.track?.title ?? "a new track"} with ${job.model}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createFocusSession() {
    if (!token) {
      setStatus("Sign in before starting a focus session.");
      return;
    }

    setBusy(true);
    try {
      const session = await apiRequest<FocusSession>(
        "/api/focus-sessions",
        {
          method: "POST",
          body: JSON.stringify({
            title: sessionTitle,
            mood: selectedMood,
            duration_minutes: sessionMinutes,
            prompt,
          }),
        },
        token,
      );

      setFocusSessions((current) => [session, ...current]);
      setActiveFocusSession(session);
      setStatus(`Focus session "${session.title}" started.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not start focus session.");
    } finally {
      setBusy(false);
    }
  }

  async function completeFocusSession() {
    if (!token || !activeFocusSession) {
      return;
    }

    try {
      const session = await apiRequest<FocusSession>(
        `/api/focus-sessions/${activeFocusSession.id}/complete`,
        { method: "POST" },
        token,
      );

      setActiveFocusSession(null);
      setFocusSessions((current) => current.map((item) => (item.id === session.id ? session : item)));
      setStatus(`Completed "${session.title}".`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not complete focus session.");
    }
  }

  async function saveProfile() {
    if (!token) {
      return;
    }

    try {
      const nextProfile = await apiRequest<Profile>(
        "/api/profile",
        {
          method: "PATCH",
          body: JSON.stringify({
            preferred_mood: selectedMood,
            daily_focus_minutes: profile?.daily_focus_minutes ?? 90,
            background_volume: profile?.background_volume ?? 60,
            onboarding_complete: true,
          }),
        },
        token,
      );

      setProfile(nextProfile);
      setStatus("Preferences saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save profile.");
    }
  }

  function selectTrack(track: Track) {
    setCurrentTrack(track);
    if (audioRef.current) {
      audioRef.current.src = track.stream_url;
      audioRef.current.volume = (profile?.background_volume ?? 60) / 100;
      void audioRef.current.play();
    }
    setStatus(`Playing ${track.title}`);
  }

  return (
    <main className="min-h-screen bg-hero-grid text-white">
      <div className="mx-auto w-[min(1380px,calc(100vw-32px))] py-8 md:py-14">
        <section className="rounded-[32px] border border-white/10 bg-slate-950/55 p-7 shadow-glow backdrop-blur md:p-10">
          <div className="flex flex-col justify-between gap-6 xl:flex-row">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.3em] text-sky">MuSync</p>
              <h1 className="max-w-4xl text-4xl font-semibold leading-none sm:text-5xl xl:text-7xl">
                Self focus music with login, generation, and session tracking.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                This MVP now exposes the auth and app APIs your website needs: users can sign up, start a focus
                block, generate ACE 1.5 tracks, and keep a personal background-music library.
              </p>
            </div>

            <div className="h-fit min-w-[260px] rounded-3xl border border-mint/20 bg-mint/10 p-5">
              <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-sky">System status</span>
              <strong className="text-white">{status}</strong>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <AuthPanel
            authMode={authMode}
            busy={busy}
            email={email}
            fullName={fullName}
            moods={moods}
            onAuthModeChange={setAuthMode}
            onAuthSubmit={handleAuthSubmit}
            onEmailChange={setEmail}
            onFullNameChange={setFullName}
            onLogout={handleLogout}
            onPasswordChange={setPassword}
            onProfileChange={setProfile}
            onSaveProfile={saveProfile}
            onSelectedMoodChange={setSelectedMood}
            password={password}
            profile={profile}
            selectedMood={selectedMood}
            user={user}
          />

          <section className="grid gap-5">
            <FocusComposer
              busy={busy}
              moods={moods}
              onCreateGeneration={createGeneration}
              onCreateSession={createFocusSession}
              onPromptChange={setPrompt}
              onSelectedMoodChange={setSelectedMood}
              onSessionMinutesChange={setSessionMinutes}
              onSessionTitleChange={setSessionTitle}
              onStartPlayback={startPlayback}
              prompt={prompt}
              selectedMood={selectedMood}
              sessionMinutes={sessionMinutes}
              sessionTitle={sessionTitle}
            />

            <PlayerPanel
              activeFocusSession={activeFocusSession}
              currentTrack={currentTrack}
              onCompleteFocusSession={completeFocusSession}
              onPause={() => {
                audioRef.current?.pause();
                setStatus("Playback paused.");
              }}
              onPlayNextTrack={playNextTrack}
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <DataListPanel countLabel={`${library.length} tracks`} title="Generated Library">
                {library.length === 0 ? <p className="text-sm text-slate-400">No generated tracks yet.</p> : null}
                {library.map((track) => (
                  <button
                    key={track.id}
                    className="grid gap-1 rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:border-sky/40"
                    onClick={() => selectTrack(track)}
                    type="button"
                  >
                    <strong className="text-white">{track.title}</strong>
                    <span className="text-sm text-slate-400">
                      {track.mood} / {track.duration_sec}s / {track.source}
                    </span>
                  </button>
                ))}
              </DataListPanel>

              <DataListPanel countLabel={`${jobs.length} jobs`} title="Generation Jobs">
                {jobs.length === 0 ? <p className="text-sm text-slate-400">No generation jobs yet.</p> : null}
                {jobs.map((job) => (
                  <div
                    key={job.job_id}
                    className="grid gap-1 rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4"
                  >
                    <strong className="text-white">{job.track?.title ?? job.job_id}</strong>
                    <span className="text-sm text-slate-400">
                      {job.status} / {job.model} / {job.mood}
                    </span>
                  </div>
                ))}
              </DataListPanel>
            </div>

            <DataListPanel countLabel={`${focusSessions.length} total`} title="Focus Sessions">
              {focusSessions.length === 0 ? <p className="text-sm text-slate-400">No focus sessions yet.</p> : null}
              {focusSessions.map((session) => (
                <div
                  key={session.id}
                  className="grid gap-1 rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4"
                >
                  <strong className="text-white">{session.title}</strong>
                  <span className="text-sm text-slate-400">
                    {session.status} / {session.mood} / {session.duration_minutes} min
                  </span>
                </div>
              ))}
            </DataListPanel>
          </section>
        </div>

        <audio onEnded={playNextTrack} preload="auto" ref={audioRef} />
      </div>
    </main>
  );
}
