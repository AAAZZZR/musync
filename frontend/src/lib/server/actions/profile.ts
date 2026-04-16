"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/server/api";
import { profileUpdateSchema } from "@/lib/validation/schemas";
import type { ActionResult, Profile } from "@/types/api";

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
  try {
    const profile = await serverFetch<Profile>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
    revalidatePath("/app/settings");
    revalidatePath("/app/dashboard");
    return { ok: true, data: profile };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed" };
  }
}
