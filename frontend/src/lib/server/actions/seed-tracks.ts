"use server";

import { prisma } from "@/lib/prisma";
import type { Track } from "@/types/api";

export async function getSeedTracksByMood(mood: string): Promise<Track[]> {
  const seeds = await prisma.seedTrack.findMany({
    where: { mood },
    orderBy: { sortOrder: "asc" },
  });

  const apiBase = process.env.API_BASE_URL ?? "http://localhost:8000";

  return seeds.map((s) => ({
    id: s.id,
    title: s.title,
    mood: s.mood,
    prompt: s.prompt,
    stream_url: s.streamUrl.startsWith("http") ? s.streamUrl : `${apiBase}${s.streamUrl}`,
    duration_sec: s.durationSec,
    source: "seed",
    created_at: new Date().toISOString(),
  }));
}

export async function getAllSeedTracks(): Promise<Record<string, Track[]>> {
  const seeds = await prisma.seedTrack.findMany({
    orderBy: [{ mood: "asc" }, { sortOrder: "asc" }],
  });

  const apiBase = process.env.API_BASE_URL ?? "http://localhost:8000";
  const byMood: Record<string, Track[]> = {};

  for (const s of seeds) {
    if (!byMood[s.mood]) byMood[s.mood] = [];
    byMood[s.mood].push({
      id: s.id,
      title: s.title,
      mood: s.mood,
      prompt: s.prompt,
      stream_url: s.streamUrl.startsWith("http") ? s.streamUrl : `${apiBase}${s.streamUrl}`,
      duration_sec: s.durationSec,
      source: "seed",
      created_at: new Date().toISOString(),
    });
  }

  return byMood;
}
