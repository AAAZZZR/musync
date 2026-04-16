"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/api";
import { loginSchema, signupSchema } from "@/lib/validation/schemas";

export async function loginAction(_prev: unknown, formData: FormData): Promise<ActionResult<null>> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  redirect("/app/dashboard");
}

export async function signupAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  redirect("/app/dashboard");
}

export async function logoutAction(): Promise<ActionResult<null>> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
