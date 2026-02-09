import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple middleware that checks for session cookie
// Actual session validation happens in API routes and pages
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for NextAuth session cookie
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  const isLoggedIn = !!sessionToken;

  const isAuthPage = pathname.startsWith("/auth");
  const isDashboardPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/repositories") ||
    pathname.startsWith("/evidence") ||
    pathname.startsWith("/exports") ||
    pathname.startsWith("/agents") ||
    pathname.startsWith("/settings");

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users to sign in
  if (!isLoggedIn && isDashboardPage) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/repositories/:path*",
    "/evidence/:path*",
    "/exports/:path*",
    "/agents/:path*",
    "/settings/:path*",
    "/auth/:path*",
  ],
};
