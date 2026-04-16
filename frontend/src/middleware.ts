import { NextResponse, type NextRequest } from "next/server";

const TOKEN_COOKIE = "musync_token";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const { pathname } = request.nextUrl;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isAppPage = pathname.startsWith("/app");

  if (!token && isAppPage) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(`${appUrl}/app/dashboard`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
