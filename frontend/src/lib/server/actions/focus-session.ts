"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/server/api";
import { focusSessionSchema } from "@/lib/validation/schemas";
import type { ActionResult, FocusSession } from "@/types/api";

export async function createFocusSessionAction(
  input: { title: string; mood: string; duration_minutes: number; prompt: string },
): Promise<ActionResult<FocusSession>> {
  const parsed = focusSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    const session = await serverFetch<FocusSession>("/api/focus-sessions", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    revalidatePath("/app/sessions");
    revalidatePath("/app/dashboard");
    return { ok: true, data: session };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Create failed" };
  }
}

export async function completeFocusSessionAction(
  sessionId: string,
): Promise<ActionResult<FocusSession>> {
  if (!sessionId) return { ok: false, error: "Missing session id" };
  try {
    const session = await serverFetch<FocusSession>(
      `/api/focus-sessions/${sessionId}/complete`,
      { method: "POST" },
    );
    revalidatePath("/app/sessions");
    revalidatePath("/app/dashboard");
    return { ok: true, data: session };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Complete failed" };
  }
}
