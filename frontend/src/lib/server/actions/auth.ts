"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { serverFetch, TOKEN_COOKIE } from "@/lib/server/api";
import { loginSchema, signupSchema } from "@/lib/validation/schemas";
import type { ActionResult, AuthResponse } from "@/types/api";

const COOKIE_OPTIONS = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

async function setSessionCookie(token: string) {
  (await cookies()).set(TOKEN_COOKIE, token, COOKIE_OPTIONS);
}

export async function loginAction(_prev: unknown, formData: FormData): Promise<ActionResult<null>> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid input",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  let auth: AuthResponse;
  try {
    auth = await serverFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Login failed" };
  }
  await setSessionCookie(auth.access_token);
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
  let auth: AuthResponse;
  try {
    auth = await serverFetch<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Signup failed" };
  }
  await setSessionCookie(auth.access_token);
  redirect("/app/dashboard");
}

export async function googleAction(idToken: string): Promise<ActionResult<null>> {
  if (!idToken) return { ok: false, error: "Missing Google ID token" };
  let auth: AuthResponse;
  try {
    auth = await serverFetch<AuthResponse>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Google sign-in failed" };
  }
  await setSessionCookie(auth.access_token);
  redirect("/app/dashboard");
}

export async function logoutAction(): Promise<ActionResult<null>> {
  try {
    await serverFetch<{ message: string }>("/api/auth/logout", { method: "POST" });
  } catch {
    // 即使 backend 失敗，清掉 cookie
  }
  (await cookies()).delete(TOKEN_COOKIE);
  redirect("/");
}
