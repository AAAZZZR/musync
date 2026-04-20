"use server";

import { serverFetch } from "@/lib/server/api";
import type { CommunityTrack } from "@/types/api";

export async function listCommunityTracksAction(input?: {
  mood?: string;
  limit?: number;
}): Promise<CommunityTrack[]> {
  const params = new URLSearchParams();
  if (input?.mood) params.set("mood", input.mood);
  if (input?.limit) params.set("limit", String(input.limit));
  const q = params.toString();
  return serverFetch<CommunityTrack[]>(`/api/community/tracks${q ? `?${q}` : ""}`);
}
