"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/server/auth";
import { profileUpdateSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/types/api";
import type { Profile } from "@prisma/client";

export async function updateProfileAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<Profile>> {
  const raw: Record<string, unknown> = Object.fromEntries(formData);
  if ("onboarding_complete" in raw) {
    raw.onboarding_complete = raw.onboarding_complete === "true";
  }
  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const current = await requireProfile();
  try {
    const profile = await prisma.profile.update({
      where: { id: current.id },
      data: {
        ...(parsed.data.full_name !== undefined && { fullName: parsed.data.full_name }),
        ...(parsed.data.preferred_mood !== undefined && {
          preferredMood: parsed.data.preferred_mood,
        }),
        ...(parsed.data.daily_focus_minutes !== undefined && {
          dailyFocusMinutes: parsed.data.daily_focus_minutes,
        }),
        ...(parsed.data.background_volume !== undefined && {
          backgroundVolume: parsed.data.background_volume,
        }),
        ...(parsed.data.onboarding_complete !== undefined && {
          onboardingComplete: parsed.data.onboarding_complete,
        }),
      },
    });
    revalidatePath("/app/settings");
    revalidatePath("/app/dashboard");
    return { ok: true, data: profile };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}
