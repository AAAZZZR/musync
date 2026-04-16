import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { serverFetch, TOKEN_COOKIE } from "@/lib/server/api";
import type { User } from "@/types/api";

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  try {
    return await serverFetch<User>("/api/auth/me");
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function clearAuthCookie() {
  (await cookies()).delete(TOKEN_COOKIE);
}
