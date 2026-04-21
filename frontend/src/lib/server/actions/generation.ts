"use server";

import { revalidatePath } from "next/cache";
import { asActionResult, serverFetch } from "@/lib/server/api";
import { generationSchema } from "@/lib/validation/schemas";
import type { ActionResult, GenerationJob, Track } from "@/types/api";

export async function createGenerationJobAction(input: {
  mood: string;
  prompt: string;
  duration_sec?: number;
  title?: string;
}): Promise<ActionResult<{ jobId: string; durationSec: number }>> {
  const parsed = generationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const r = await asActionResult(() =>
    serverFetch<GenerationJob>("/api/generation/jobs", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    }),
  );
  if (!r.ok) return r;
  return { ok: true, data: { jobId: r.data.id, durationSec: r.data.duration_sec } };
}

export async function pollGenerationJobAction(
  jobId: string,
): Promise<ActionResult<{ status: "pending" | "completed" | "failed"; track: Track | null }>> {
  const r = await asActionResult(() => serverFetch<GenerationJob>(`/api/generation/jobs/${jobId}`));
  if (!r.ok) return r;

  if (r.data.status === "completed") revalidatePath("/app/dashboard");

  return {
    ok: true,
    data: {
      status: r.data.status,
      track: r.data.track,
    },
  };
}

export async function cancelGenerationJobAction(
  jobId: string,
): Promise<ActionResult<{ id: string }>> {
  if (!jobId) return { ok: false, error: "Missing job id" };
  const r = await asActionResult(() =>
    serverFetch<GenerationJob>(`/api/generation/jobs/${jobId}/cancel`, { method: "POST" }),
  );
  if (!r.ok) return r;
  revalidatePath("/app/dashboard");
  return { ok: true, data: { id: r.data.id } };
}
