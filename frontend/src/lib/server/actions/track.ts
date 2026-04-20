"use server";

import { revalidatePath } from "next/cache";
import { asActionResult, serverFetch } from "@/lib/server/api";
import type { ActionResult, Track } from "@/types/api";

export async function deleteTrackAction(trackId: string): Promise<ActionResult<{ id: string }>> {
  const r = await asActionResult(() =>
    serverFetch<{ id: string }>(`/api/tracks/${trackId}`, { method: "DELETE" }),
  );
  if (r.ok) revalidatePath("/app/dashboard");
  return r;
}

export async function publishTrackAction(
  trackId: string,
): Promise<ActionResult<{ id: string; isPublic: boolean; publishedAt: string | null }>> {
  const r = await asActionResult(() =>
    serverFetch<Track>(`/api/tracks/${trackId}/publish`, { method: "POST" }),
  );
  if (!r.ok) return r;
  revalidatePath("/app/dashboard");
  return {
    ok: true,
    data: { id: r.data.id, isPublic: r.data.is_public, publishedAt: r.data.published_at },
  };
}

export async function unpublishTrackAction(
  trackId: string,
): Promise<ActionResult<{ id: string; isPublic: boolean; publishedAt: string | null }>> {
  const r = await asActionResult(() =>
    serverFetch<Track>(`/api/tracks/${trackId}/unpublish`, { method: "POST" }),
  );
  if (!r.ok) return r;
  revalidatePath("/app/dashboard");
  return {
    ok: true,
    data: { id: r.data.id, isPublic: r.data.is_public, publishedAt: r.data.published_at },
  };
}

export async function listTracksAction(): Promise<Track[]> {
  return serverFetch<Track[]>("/api/tracks");
}
