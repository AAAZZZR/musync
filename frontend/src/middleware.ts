import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8000";
const REFRESH_THRESHOLD_SEC = 60;
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

function b64urlDecode(s: string): string {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  return atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
}

function expInSec(token: string): number {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return -1;
    const payload = JSON.parse(b64urlDecode(parts[1])) as { exp?: number };
    return (payload.exp ?? 0) - Math.floor(Date.now() / 1000);
  } catch {
    return -1;
  }
}

type RefreshedSession = { access: string; refresh: string; expiresIn: number };

async function tryRefresh(refreshToken: string): Promise<RefreshedSession | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    return { access: data.access_token, refresh: data.refresh_token, expiresIn: data.expires_in };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isAppPage = pathname.startsWith("/app");

  let access = req.cookies.get("mu_access")?.value;
  const refresh = req.cookies.get("mu_refresh")?.value;

  let refreshed: RefreshedSession | null = null;
  if (access && refresh && expInSec(access) < REFRESH_THRESHOLD_SEC) {
    refreshed = await tryRefresh(refresh);
    if (refreshed) access = refreshed.access;
    else access = undefined;
  }

  if (!access && isAppPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (access && isAuthPage) {
    return NextResponse.redirect(new URL("/app/dashboard", req.url));
  }

  const response = NextResponse.next();
  if (refreshed) {
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set("mu_access", refreshed.access, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: refreshed.expiresIn,
      path: "/",
    });
    response.cookies.set("mu_refresh", refreshed.refresh, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: REFRESH_MAX_AGE,
      path: "/",
    });
  }
  return response;
}

export const config = {
  matcher: ["/app/:path*", "/login", "/signup"],
};
