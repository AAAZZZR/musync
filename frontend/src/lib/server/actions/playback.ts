"use server";

import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/server/auth";
import { normalizePrompt } from "@/lib/constants/moods";
import { playbackStartSchema } from "@/lib/validation/schemas";
import type { ActionResult, StartPlaybackResponse, Track } from "@/types/api";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

function toAbsoluteStreamUrl(relativeUrl: string): string {
  if (relativeUrl.startsWith("http")) return relativeUrl;
  return `${API_BASE}${relativeUrl}`;
}

export async function startPlaybackAction(input: {
  mood: string;
  prompt: string;
}): Promise<ActionResult<StartPlaybackResponse>> {
  const parsed = playbackStartSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const profile = await requireProfile();
  const promptNormalized = normalizePrompt(parsed.data.mood, parsed.data.prompt);

  try {
    const session = await prisma.playbackSession.create({
      data: {
        profileId: profile.id,
        mood: parsed.data.mood,
        prompt: parsed.data.prompt,
        promptNormalized,
      },
    });

    const seedTrack = await prisma.seedTrack.findFirst({
      where: { mood: parsed.data.mood },
      orderBy: { sortOrder: "asc" },
    });

    if (!seedTrack) return { ok: false, error: "No tracks available for this mood" };

    return {
      ok: true,
      data: {
        session_id: session.id,
        track: {
          id: seedTrack.id,
          title: seedTrack.title,
          mood: seedTrack.mood,
          prompt: seedTrack.prompt,
          stream_url: toAbsoluteStreamUrl(seedTrack.streamUrl),
          duration_sec: seedTrack.durationSec,
          source: "seed",
          created_at: new Date().toISOString(),
        },
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Playback failed" };
  }
}

export async function nextTrackAction(sessionId: string): Promise<ActionResult<{ track: Track }>> {
  if (!sessionId) return { ok: false, error: "Missing session id" };

  const profile = await requireProfile();
  try {
    const session = await prisma.playbackSession.findFirst({
      where: { id: sessionId, profileId: profile.id },
    });
    if (!session) return { ok: false, error: "Session not found" };

    const count = await prisma.seedTrack.count({ where: { mood: session.mood } });
    const skip = Math.floor(Math.random() * count);
    const seedTrack = await prisma.seedTrack.findFirst({
      where: { mood: session.mood },
      skip,
    });

    if (!seedTrack) return { ok: false, error: "No tracks available" };

    return {
      ok: true,
      data: {
        track: {
          id: seedTrack.id,
          title: seedTrack.title,
          mood: seedTrack.mood,
          prompt: seedTrack.prompt,
          stream_url: toAbsoluteStreamUrl(seedTrack.streamUrl),
          duration_sec: seedTrack.durationSec,
          source: "seed",
          created_at: new Date().toISOString(),
        },
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Next failed" };
  }
}
