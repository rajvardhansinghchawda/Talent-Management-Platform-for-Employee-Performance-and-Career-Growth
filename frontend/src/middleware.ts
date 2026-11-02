import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  const isProtectedPath =
    pathname === "/" ||
    pathname === "/hr" ||
    pathname.startsWith("/hr/") ||
    pathname === "/manager" ||
    pathname.startsWith("/manager/") ||
    pathname === "/executive" ||
    pathname.startsWith("/executive/") ||
    pathname === "/employee" ||
    pathname.startsWith("/employee/") ||
    pathname === "/notifications" ||
    pathname.startsWith("/notifications/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/change-password";

  // If attempting to access root or a protected portal without a session refresh cookie,
  // immediately redirect to the login page.
  if (isProtectedPath && !refreshToken) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/hr",
    "/hr/:path*",
    "/manager",
    "/manager/:path*",
    "/executive",
    "/executive/:path*",
    "/employee",
    "/employee/:path*",
    "/notifications",
    "/notifications/:path*",
    "/settings",
    "/settings/:path*",
    "/change-password",
  ],
};
