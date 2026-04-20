"use server";

import { asActionResult, serverFetch } from "@/lib/server/api";
import type { ActionResult, StreamUrl } from "@/types/api";

type StreamKind = "seed" | "track";

export async function getStreamUrlAction(
  kind: StreamKind,
  id: string,
): Promise<ActionResult<{ url: string; expiresIn: number }>> {
  const r = await asActionResult(() => serverFetch<StreamUrl>(`/api/stream/${kind}/${id}`));
  if (!r.ok) return r;
  return { ok: true, data: { url: r.data.url, expiresIn: r.data.expires_in } };
}
