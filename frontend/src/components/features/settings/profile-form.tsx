"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProfileAction } from "@/lib/server/actions/profile";
import type { Mood, Profile } from "@/types/api";

export function ProfileForm({ profile, moods }: { profile: Profile; moods: Mood[] }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, null);
  const [volume, setVolume] = useState(profile.background_volume);

  if (state?.ok) toast.success("Profile saved");
  else if (state && !state.ok && !state.fieldErrors) toast.error(state.error);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid max-w-xl gap-5">
      <div className="grid gap-2">
        <Label htmlFor="full_name">Name</Label>
        <Input id="full_name" name="full_name" defaultValue={profile.full_name} />
        {fieldErrors?.full_name ? (
          <p className="text-xs text-destructive">{fieldErrors.full_name[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="preferred_mood">Preferred mood</Label>
        <Select name="preferred_mood" defaultValue={profile.preferred_mood}>
          <SelectTrigger id="preferred_mood">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {moods.map((m) => (
              <SelectItem key={m.key} value={m.key}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="daily_focus_minutes">Daily focus target (min)</Label>
        <Input
          id="daily_focus_minutes"
          name="daily_focus_minutes"
          type="number"
          min={15}
          max={480}
          defaultValue={profile.daily_focus_minutes}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="background_volume">Background volume</Label>
          <span className="text-xs text-muted-foreground">{volume}%</span>
        </div>
        <Slider
          id="background_volume"
          value={[volume]}
          onValueChange={(v) => setVolume(v[0])}
          min={0}
          max={100}
          step={1}
        />
        <input type="hidden" name="background_volume" value={volume} />
      </div>

      <input type="hidden" name="onboarding_complete" value="true" />

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving..." : "Save preferences"}
      </Button>
    </form>
  );
}
