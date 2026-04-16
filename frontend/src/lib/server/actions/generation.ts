"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/server/auth";
import { serverFetch } from "@/lib/server/api";
import { generationSchema } from "@/lib/validation/schemas";
import type { ActionResult, Track } from "@/types/api";

type BackendGenerationResponse = {
  job_id: string;
  mood: string;
  prompt: string;
  prompt_normalized: string;
  model: string;
  status: string;
  duration_sec: number;
  created_at: string;
  completed_at: string | null;
  track: {
    id: string;
    title: string;
    mood: string;
    prompt: string;
    stream_url: string;
    duration_sec: number;
    source: string;
    created_at: string;
  } | null;
};

export async function createGenerationJobAction(input: {
  mood: string;
  prompt: string;
  duration_sec?: number;
  title?: string;
}): Promise<ActionResult<{ track: Track | null }>> {
  const parsed = generationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const profile = await requireProfile();

  try {
    const res = await serverFetch<BackendGenerationResponse>("/api/generation/jobs", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });

    let savedTrack: Track | null = null;
    let trackId: string | null = null;
    if (res.track) {
      const dbTrack = await prisma.track.create({
        data: {
          profileId: profile.id,
          title: res.track.title,
          mood: res.track.mood,
          prompt: res.track.prompt,
          streamUrl: res.track.stream_url,
          durationSec: res.track.duration_sec,
          source: res.track.source,
        },
      });
      trackId = dbTrack.id;
      savedTrack = {
        id: dbTrack.id,
        title: dbTrack.title,
        mood: dbTrack.mood,
        prompt: dbTrack.prompt,
        stream_url: dbTrack.streamUrl,
        duration_sec: dbTrack.durationSec,
        source: dbTrack.source,
        created_at: dbTrack.createdAt.toISOString(),
      };
    }

    await prisma.generationJob.create({
      data: {
        profileId: profile.id,
        mood: res.mood,
        prompt: res.prompt,
        promptNormalized: res.prompt_normalized,
        model: res.model,
        status: res.status,
        durationSec: res.duration_sec,
        trackId,
        completedAt: res.completed_at ? new Date(res.completed_at) : null,
      },
    });

    revalidatePath("/app/library");
    revalidatePath("/app/dashboard");
    return { ok: true, data: { track: savedTrack } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Generation failed" };
  }
}
