"use server";

import { asActionResult, serverFetch } from "@/lib/server/api";
import { playbackStartSchema } from "@/lib/validation/schemas";
import type { ActionResult, SeedTrack, StartPlaybackResponse } from "@/types/api";

export async function startPlaybackAction(input: {
  mood: string;
  prompt: string;
}): Promise<ActionResult<StartPlaybackResponse>> {
  const parsed = playbackStartSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  return asActionResult(() =>
    serverFetch<StartPlaybackResponse>("/api/playback/start", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    }),
  );
}

export async function nextTrackAction(
  sessionId: string,
): Promise<ActionResult<{ track: SeedTrack }>> {
  if (!sessionId) return { ok: false, error: "Missing session id" };
  const r = await asActionResult(() =>
    serverFetch<SeedTrack>(`/api/playback/sessions/${sessionId}/next`, { method: "POST" }),
  );
  if (!r.ok) return r;
  return { ok: true, data: { track: r.data } };
}
