"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/server/api";
import { generationSchema } from "@/lib/validation/schemas";
import type { ActionResult, GenerationJob } from "@/types/api";

export async function createGenerationJobAction(input: {
  mood: string;
  prompt: string;
  duration_sec?: number;
  title?: string;
}): Promise<ActionResult<GenerationJob>> {
  const parsed = generationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    const job = await serverFetch<GenerationJob>("/api/generation/jobs", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    revalidatePath("/app/library");
    revalidatePath("/app/dashboard");
    return { ok: true, data: job };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Generation failed" };
  }
}
