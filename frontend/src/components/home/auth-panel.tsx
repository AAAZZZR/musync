import { FormEvent } from "react";

import type { Mood, Profile, User } from "@/types/app";

type AuthPanelProps = {
  authMode: "login" | "signup";
  busy: boolean;
  email: string;
  fullName: string;
  moods: Mood[];
  password: string;
  profile: Profile | null;
  selectedMood: string;
  user: User | null;
  onAuthModeChange: (mode: "login" | "signup") => void;
  onAuthSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEmailChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onLogout: () => void;
  onPasswordChange: (value: string) => void;
  onProfileChange: (profile: Profile | null) => void;
  onSaveProfile: () => void;
  onSelectedMoodChange: (value: string) => void;
};

export function AuthPanel(props: AuthPanelProps) {
  const {
    authMode,
    busy,
    email,
    fullName,
    moods,
    password,
    profile,
    selectedMood,
    user,
    onAuthModeChange,
    onAuthSubmit,
    onEmailChange,
    onFullNameChange,
    onLogout,
    onPasswordChange,
    onProfileChange,
    onSaveProfile,
    onSelectedMoodChange,
  } = props;

  return (
    <aside className="rounded-[28px] border border-white/10 bg-slate-950/55 p-6 shadow-glow backdrop-blur">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">Account</h2>
        {user ? (
          <button
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky/40"
            onClick={onLogout}
            type="button"
          >
            Logout
          </button>
        ) : null}
      </div>

      {!user ? (
        <form className="grid gap-4" onSubmit={onAuthSubmit}>
          <div className="grid grid-cols-2 gap-2 rounded-full bg-white/5 p-1">
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                authMode === "signup" ? "bg-mint/20 text-white" : "text-slate-400"
              }`}
              onClick={() => onAuthModeChange("signup")}
              type="button"
            >
              Sign up
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                authMode === "login" ? "bg-mint/20 text-white" : "text-slate-400"
              }`}
              onClick={() => onAuthModeChange("login")}
              type="button"
            >
              Login
            </button>
          </div>

          {authMode === "signup" ? (
            <label className="grid gap-2">
              <span className="text-sm text-slate-400">Name</span>
              <input
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-sky/50"
                onChange={(event) => onFullNameChange(event.target.value)}
                value={fullName}
              />
            </label>
          ) : null}

          <label className="grid gap-2">
            <span className="text-sm text-slate-400">Email</span>
            <input
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-sky/50"
              onChange={(event) => onEmailChange(event.target.value)}
              type="email"
              value={email}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-slate-400">Password</span>
            <input
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-sky/50"
              onChange={(event) => onPasswordChange(event.target.value)}
              type="password"
              value={password}
            />
          </label>

          <button
            className="rounded-full bg-mint px-4 py-3 font-semibold text-ink transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-65"
            disabled={busy}
            type="submit"
          >
            {busy ? "Working..." : authMode === "signup" ? "Create account" : "Login"}
          </button>
        </form>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-1">
            <strong className="text-white">{profile?.full_name ?? user.email}</strong>
            <span className="text-sm text-slate-400">{user.email}</span>
          </div>

          <label className="grid gap-2">
            <span className="text-sm text-slate-400">Preferred mood</span>
            <select
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-sky/50"
              onChange={(event) => onSelectedMoodChange(event.target.value)}
              value={selectedMood}
            >
              {moods.map((mood) => (
                <option key={mood.key} value={mood.key}>
                  {mood.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-slate-400">Daily focus target</span>
            <input
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-sky/50"
              max={480}
              min={15}
              onChange={(event) =>
                onProfileChange(
                  profile ? { ...profile, daily_focus_minutes: Number(event.target.value) } : profile,
                )
              }
              type="number"
              value={profile?.daily_focus_minutes ?? 90}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-slate-400">Background volume</span>
            <input
              className="accent-mint"
              max={100}
              min={0}
              onChange={(event) =>
                onProfileChange(profile ? { ...profile, background_volume: Number(event.target.value) } : profile)
              }
              type="range"
              value={profile?.background_volume ?? 60}
            />
          </label>

          <button
            className="rounded-full border border-white/15 px-4 py-3 font-semibold text-white transition hover:border-sky/40"
            onClick={onSaveProfile}
            type="button"
          >
            Save preferences
          </button>
        </div>
      )}
    </aside>
  );
}
