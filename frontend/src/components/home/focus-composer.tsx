import type { Mood } from "@/types/app";

type FocusComposerProps = {
  busy: boolean;
  moods: Mood[];
  prompt: string;
  selectedMood: string;
  sessionMinutes: number;
  sessionTitle: string;
  onCreateGeneration: () => void;
  onCreateSession: () => void;
  onPromptChange: (value: string) => void;
  onSelectedMoodChange: (value: string) => void;
  onSessionMinutesChange: (value: number) => void;
  onSessionTitleChange: (value: string) => void;
  onStartPlayback: () => void;
};

export function FocusComposer(props: FocusComposerProps) {
  const {
    busy,
    moods,
    prompt,
    selectedMood,
    sessionMinutes,
    sessionTitle,
    onCreateGeneration,
    onCreateSession,
    onPromptChange,
    onSelectedMoodChange,
    onSessionMinutesChange,
    onSessionTitleChange,
    onStartPlayback,
  } = props;

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/55 p-6 shadow-glow backdrop-blur">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">Focus Composer</h2>
        <span className="rounded-full border border-mint/20 bg-mint/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-mint">
          {selectedMood}
        </span>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {moods.map((mood) => (
          <button
            key={mood.key}
            className={`grid gap-2 rounded-3xl border px-4 py-4 text-left transition ${
              selectedMood === mood.key
                ? "border-mint/50 bg-mint/10 text-white"
                : "border-white/10 bg-white/[0.03] text-white hover:border-sky/40"
            }`}
            onClick={() => onSelectedMoodChange(mood.key)}
            type="button"
          >
            <strong>{mood.label}</strong>
            <span className="text-sm text-slate-400">{mood.description}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm text-slate-400">Session title</span>
          <input
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-sky/50"
            onChange={(event) => onSessionTitleChange(event.target.value)}
            value={sessionTitle}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-slate-400">Minutes</span>
          <input
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-sky/50"
            max={180}
            min={5}
            onChange={(event) => onSessionMinutesChange(Number(event.target.value))}
            type="number"
            value={sessionMinutes}
          />
        </label>
      </div>

      <label className="mb-5 grid gap-2">
        <span className="text-sm text-slate-400">Prompt for ACE 1.5</span>
        <textarea
          className="min-h-32 rounded-3xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-sky/50"
          maxLength={180}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder="lofi piano, brown noise, no vocal, seamless loop"
          value={prompt}
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-full bg-mint px-5 py-3 font-semibold text-ink transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-65"
          disabled={busy}
          onClick={onCreateGeneration}
          type="button"
        >
          Generate music
        </button>
        <button
          className="rounded-full border border-white/15 px-5 py-3 font-semibold text-white transition hover:border-sky/40 disabled:cursor-wait disabled:opacity-65"
          disabled={busy}
          onClick={onCreateSession}
          type="button"
        >
          Start focus session
        </button>
        <button
          className="rounded-full border border-white/15 px-5 py-3 font-semibold text-white transition hover:border-sky/40 disabled:cursor-wait disabled:opacity-65"
          disabled={busy}
          onClick={onStartPlayback}
          type="button"
        >
          Start playback
        </button>
      </div>
    </section>
  );
}
