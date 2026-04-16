import type { FocusSession, Track } from "@/types/app";

type PlayerPanelProps = {
  activeFocusSession: FocusSession | null;
  currentTrack: Track | null;
  onCompleteFocusSession: () => void;
  onPause: () => void;
  onPlayNextTrack: () => void;
};

export function PlayerPanel(props: PlayerPanelProps) {
  const { activeFocusSession, currentTrack, onCompleteFocusSession, onPause, onPlayNextTrack } = props;

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/55 p-6 shadow-glow backdrop-blur">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">Background Player</h2>
        <span className="rounded-full border border-sky/20 bg-sky/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-sky">
          {currentTrack?.source ?? "idle"}
        </span>
      </div>

      <div className="mb-5 grid gap-2 rounded-3xl border border-sky/10 bg-gradient-to-br from-sky/10 to-mint/10 p-5">
        <strong className="text-lg text-white">{currentTrack?.title ?? "No track selected"}</strong>
        <span className="text-sm leading-6 text-slate-300">
          {currentTrack?.prompt ?? "Generate a track or choose one from your library."}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-full border border-white/15 px-5 py-3 font-semibold text-white transition hover:border-sky/40"
          onClick={onPlayNextTrack}
          type="button"
        >
          Next track
        </button>
        <button
          className="rounded-full border border-white/15 px-5 py-3 font-semibold text-white transition hover:border-sky/40"
          onClick={onPause}
          type="button"
        >
          Pause
        </button>
        {activeFocusSession ? (
          <button
            className="rounded-full border border-white/15 px-5 py-3 font-semibold text-white transition hover:border-mint/40"
            onClick={onCompleteFocusSession}
            type="button"
          >
            Complete active session
          </button>
        ) : null}
      </div>
    </section>
  );
}
