"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Mood } from "@/types/api";

export function MoodFilter({ moods, activeMood }: { moods: Mood[]; activeMood?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/app/community"
        className={cn(
          "rounded-full border px-3 py-1 text-xs transition-colors",
          !activeMood
            ? "border-primary bg-primary/10 text-foreground"
            : "text-muted-foreground hover:border-foreground/30",
        )}
      >
        All
      </Link>
      {moods.map((m) => (
        <Link
          key={m.key}
          href={`/app/community?mood=${m.key}`}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            activeMood === m.key
              ? "border-primary bg-primary/10 text-foreground"
              : "text-muted-foreground hover:border-foreground/30",
          )}
        >
          {m.label}
        </Link>
      ))}
    </div>
  );
}
