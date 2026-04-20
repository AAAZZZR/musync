"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { updateProfileAction } from "@/lib/server/actions/profile";
import type { Mood } from "@/types/api";

export function OnboardingForm({
  moods,
  defaults,
}: {
  moods: Mood[];
  defaults: { preferred_mood: string; daily_focus_minutes: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mood, setMood] = useState(defaults.preferred_mood);
  const [minutes, setMinutes] = useState(defaults.daily_focus_minutes);

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("preferred_mood", mood);
      fd.set("daily_focus_minutes", String(minutes));
      fd.set("onboarding_complete", "true");
      const r = await updateProfileAction(null, fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      router.push("/app/dashboard");
    });
  }

  return (
    <Card className="grid gap-8 p-8">
      <div className="grid gap-3">
        <Label className="text-base">Pick your main mood</Label>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {moods.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMood(m.key)}
              className={cn(
                "rounded-lg border px-4 py-3 text-left transition-all",
                mood === m.key
                  ? "border-primary bg-primary/10"
                  : "hover:border-foreground/30",
              )}
            >
              <p className="font-medium">{m.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">Daily focus goal</Label>
          <span className="text-sm tabular-nums text-muted-foreground">{minutes} min</span>
        </div>
        <Slider
          value={[minutes]}
          onValueChange={(v) => setMinutes(v[0])}
          min={15}
          max={240}
          step={15}
        />
        <p className="text-xs text-muted-foreground">Can be changed later in Settings.</p>
      </div>

      <Button onClick={handleSubmit} disabled={pending} className="w-full">
        {pending ? "Saving..." : "Get started"}
      </Button>
    </Card>
  );
}
