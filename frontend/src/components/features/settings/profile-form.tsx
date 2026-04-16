"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProfileAction } from "@/lib/server/actions/profile";
import type { Mood, Profile } from "@/types/api";

export function ProfileForm({ profile, moods }: { profile: Profile; moods: Mood[] }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, null);

  if (state?.ok) toast.success("Profile saved");
  else if (state && !state.ok && !state.fieldErrors) toast.error(state.error);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid max-w-lg gap-5">
      <div className="grid gap-2">
        <Label htmlFor="full_name">Name</Label>
        <Input id="full_name" name="full_name" defaultValue={profile.full_name} />
        {fieldErrors?.full_name ? <p className="text-xs text-destructive">{fieldErrors.full_name[0]}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="preferred_mood">Preferred mood</Label>
        <Select name="preferred_mood" defaultValue={profile.preferred_mood}>
          <SelectTrigger id="preferred_mood"><SelectValue /></SelectTrigger>
          <SelectContent>
            {moods.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="daily_focus_minutes">Daily focus minutes</Label>
        <Input id="daily_focus_minutes" name="daily_focus_minutes" type="number"
               min={15} max={480} defaultValue={profile.daily_focus_minutes} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="background_volume">Background volume</Label>
        <Input id="background_volume" name="background_volume" type="number"
               min={0} max={100} defaultValue={profile.background_volume} />
      </div>

      <input type="hidden" name="onboarding_complete" value="true" />

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save preferences"}
      </Button>
    </form>
  );
}
