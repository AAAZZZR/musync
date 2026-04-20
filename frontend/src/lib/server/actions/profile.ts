"use server";

import { revalidatePath } from "next/cache";
import { asActionResult, serverFetch } from "@/lib/server/api";
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

  const r = await asActionResult(() =>
    serverFetch<Profile>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    }),
  );
  if (r.ok) {
    revalidatePath("/app/settings");
    revalidatePath("/app/dashboard");
  }
  return r;
}
