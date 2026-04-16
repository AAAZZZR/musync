"use client";

import { cn } from "@/lib/utils";
import type { Mood } from "@/types/api";

export function MoodPicker({
  moods,
  value,
  onChange,
}: {
  moods: Mood[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {moods.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onChange(m.key)}
          className={cn(
            "rounded-md border px-4 py-3 text-left transition-colors",
            value === m.key ? "border-primary bg-primary/10" : "hover:border-foreground/30",
          )}
        >
          <p className="font-medium">{m.label}</p>
          <p className="text-xs text-muted-foreground">{m.description}</p>
        </button>
      ))}
    </div>
  );
}
