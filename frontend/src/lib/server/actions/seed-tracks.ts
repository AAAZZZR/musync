"use server";

import { serverFetch } from "@/lib/server/api";
import { seedToTrack } from "@/lib/tracks";
import type { SeedTrack, Track } from "@/types/api";

export async function getSeedTracksByMood(mood: string): Promise<Track[]> {
  const seeds = await serverFetch<SeedTrack[]>(
    `/api/seed-tracks?mood=${encodeURIComponent(mood)}`,
  );
  return seeds.map(seedToTrack);
}

export async function getAllSeedTracks(): Promise<Record<string, Track[]>> {
  const seeds = await serverFetch<SeedTrack[]>("/api/seed-tracks");
  const byMood: Record<string, Track[]> = {};
  for (const s of seeds) {
    if (!byMood[s.mood]) byMood[s.mood] = [];
    byMood[s.mood].push(seedToTrack(s));
  }
  return byMood;
}
