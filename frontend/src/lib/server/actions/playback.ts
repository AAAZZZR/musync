"use server";

import { serverFetch } from "@/lib/server/api";
import { playbackStartSchema } from "@/lib/validation/schemas";
import type { ActionResult, StartPlaybackResponse, Track } from "@/types/api";

export async function startPlaybackAction(
  input: { mood: string; prompt: string },
): Promise<ActionResult<StartPlaybackResponse>> {
  const parsed = playbackStartSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  try {
    const data = await serverFetch<StartPlaybackResponse>("/api/play/start", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Playback failed" };
  }
}

export async function nextTrackAction(
  sessionId: string,
): Promise<ActionResult<{ track: Track }>> {
  if (!sessionId) return { ok: false, error: "Missing session id" };
  try {
    const data = await serverFetch<{ track: Track }>("/api/play/next", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Next failed" };
  }
}
