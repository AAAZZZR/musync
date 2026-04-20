import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, serverFetch } from "@/lib/server/api";
import type { Profile } from "@/types/api";

export async function hasSession(): Promise<boolean> {
  const c = await cookies();
  return !!c.get("mu_access")?.value;
}

export async function requireSession(): Promise<void> {
  if (!(await hasSession())) redirect("/login");
}

export async function getProfile(): Promise<Profile | null> {
  if (!(await hasSession())) return null;
  try {
    return await serverFetch<Profile>("/api/profile");
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 404)) return null;
    throw e;
  }
}

export async function requireProfile(): Promise<Profile> {
  await requireSession();
  try {
    return await serverFetch<Profile>("/api/profile");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect("/login");
    throw e;
  }
}
