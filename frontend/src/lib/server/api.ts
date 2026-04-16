import { cookies } from "next/headers";

const BASE = process.env.API_BASE_URL ?? "http://localhost:8000";
export const TOKEN_COOKIE = "musync_token";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor() {
    super("Unauthorized", 401);
    this.name = "UnauthorizedError";
  }
}

export async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BASE}${path}`, { cache: "no-store", ...init, headers });

  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiError(data?.detail ?? res.statusText, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
