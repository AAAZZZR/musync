"use server";

import { revalidatePath } from "next/cache";
import { asActionResult, serverFetch } from "@/lib/server/api";
import { focusSessionSchema } from "@/lib/validation/schemas";
import type { ActionResult, FocusSession } from "@/types/api";

export async function createFocusSessionAction(input: {
  title: string;
  mood: string;
  duration_minutes: number;
  prompt: string;
}): Promise<ActionResult<FocusSession>> {
  const parsed = focusSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const r = await asActionResult(() =>
    serverFetch<FocusSession>("/api/focus-sessions", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    }),
  );
  if (r.ok) revalidatePath("/app/dashboard");
  return r;
}

export async function completeFocusSessionAction(
  sessionId: string,
): Promise<ActionResult<FocusSession>> {
  if (!sessionId) return { ok: false, error: "Missing session id" };
  const r = await asActionResult(() =>
    serverFetch<FocusSession>(`/api/focus-sessions/${sessionId}/complete`, { method: "POST" }),
  );
  if (r.ok) revalidatePath("/app/dashboard");
  return r;
}

export async function pauseFocusSessionAction(
  sessionId: string,
): Promise<ActionResult<FocusSession>> {
  if (!sessionId) return { ok: false, error: "Missing session id" };
  const r = await asActionResult(() =>
    serverFetch<FocusSession>(`/api/focus-sessions/${sessionId}/pause`, { method: "POST" }),
  );
  if (r.ok) revalidatePath("/app/dashboard");
  return r;
}

export async function resumeFocusSessionAction(
  sessionId: string,
): Promise<ActionResult<FocusSession>> {
  if (!sessionId) return { ok: false, error: "Missing session id" };
  const r = await asActionResult(() =>
    serverFetch<FocusSession>(`/api/focus-sessions/${sessionId}/resume`, { method: "POST" }),
  );
  if (r.ok) revalidatePath("/app/dashboard");
  return r;
}

export async function abandonFocusSessionAction(
  sessionId: string,
): Promise<ActionResult<FocusSession>> {
  if (!sessionId) return { ok: false, error: "Missing session id" };
  const r = await asActionResult(() =>
    serverFetch<FocusSession>(`/api/focus-sessions/${sessionId}/abandon`, { method: "POST" }),
  );
  if (r.ok) revalidatePath("/app/dashboard");
  return r;
}
