"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types/api";
import { asActionResult, serverFetch } from "@/lib/server/api";
import {
  changeEmailSchema,
  changePasswordSchema,
  loginSchema,
  signupSchema,
} from "@/lib/validation/schemas";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: string;
  email: string;
};

async function setSessionCookies(session: AuthSession) {
  const c = await cookies();
  const secure = process.env.NODE_ENV === "production";
  c.set("mu_access", session.access_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: session.expires_in,
    path: "/",
  });
  c.set("mu_refresh", session.refresh_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: REFRESH_MAX_AGE,
    path: "/",
  });
}

async function clearSessionCookies() {
  const c = await cookies();
  c.delete("mu_access");
  c.delete("mu_refresh");
}

async function postAuth(path: string, body: unknown): Promise<{ ok: true; data: AuthSession } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { detail?: string } | null;
      return { ok: false, error: data?.detail ?? res.statusText };
    }
    const session = (await res.json()) as AuthSession;
    return { ok: true, data: session };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

export async function loginAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const r = await postAuth("/api/auth/login", parsed.data);
  if (!r.ok) return { ok: false, error: r.error };
  await setSessionCookies(r.data);
  redirect("/app/dashboard");
}

export async function signupAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const r = await postAuth("/api/auth/signup", parsed.data);
  if (!r.ok) return { ok: false, error: r.error };
  await setSessionCookies(r.data);
  redirect("/app/dashboard");
}

export async function logoutAction(): Promise<ActionResult<null>> {
  const c = await cookies();
  const token = c.get("mu_access")?.value;
  // Fire-and-forget Supabase revoke
  if (token) {
    fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => {});
  }
  await clearSessionCookies();
  redirect("/");
}

export async function changePasswordAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const r = await asActionResult(() =>
    serverFetch<{ ok: boolean }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: parsed.data.current_password,
        new_password: parsed.data.new_password,
      }),
    }),
  );
  if (!r.ok) return r;
  return { ok: true, data: null };
}

export async function changeEmailAction(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ email: string }>> {
  const parsed = changeEmailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const r = await asActionResult(() =>
    serverFetch<{ ok: boolean; email: string }>("/api/auth/change-email", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    }),
  );
  if (!r.ok) return r;
  return { ok: true, data: { email: r.data.email } };
}

export async function deleteAccountAction(): Promise<ActionResult<null>> {
  const r = await asActionResult(() =>
    serverFetch<{ ok: boolean }>("/api/profile", { method: "DELETE" }),
  );
  if (!r.ok) return r;
  await clearSessionCookies();
  redirect("/");
}
