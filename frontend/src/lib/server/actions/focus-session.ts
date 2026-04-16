"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/server/auth";
import { focusSessionSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/types/api";
import type { FocusSession } from "@prisma/client";

export async function createFocusSessionAction(input: {
  title: string;
  mood: string;
  duration_minutes: number;
  prompt: string;
}): Promise<ActionResult<FocusSession>> {
  const parsed = focusSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const profile = await requireProfile();
  try {
    const session = await prisma.focusSession.create({
      data: {
        profileId: profile.id,
        title: parsed.data.title,
        mood: parsed.data.mood,
        durationMinutes: parsed.data.duration_minutes,
        prompt: parsed.data.prompt,
        status: "active",
      },
    });
    revalidatePath("/app/sessions");
    revalidatePath("/app/dashboard");
    return { ok: true, data: session };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Create failed" };
  }
}

export async function completeFocusSessionAction(
  sessionId: string,
): Promise<ActionResult<FocusSession>> {
  if (!sessionId) return { ok: false, error: "Missing session id" };
  const profile = await requireProfile();
  try {
    const session = await prisma.focusSession.update({
      where: { id: sessionId, profileId: profile.id },
      data: { status: "completed", completedAt: new Date() },
    });
    revalidatePath("/app/sessions");
    revalidatePath("/app/dashboard");
    return { ok: true, data: session };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Complete failed" };
  }
}
