import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/verify"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // API routes: auth is checked inside each route handler via auth-guard
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Client-side pages: the auth check happens in the layout/page components
  // via the AuthProvider. Middleware cannot verify Firebase tokens at the edge
  // without the Admin SDK, so page-level protection is handled client-side
  // and all data access is gated by server-side API auth guards.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
