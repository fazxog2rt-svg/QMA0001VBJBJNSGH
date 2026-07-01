import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Name of the httpOnly cookie apps/api sets after a successful login
 * (see apps/api JWT issuance — access token TTL 15m, refresh 30d). This
 * middleware only checks for cookie *presence*; the API is the source of
 * truth for signature/expiry validation on every request it serves.
 */
const ACCESS_TOKEN_COOKIE = "access_token";

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasToken = request.cookies.has(ACCESS_TOKEN_COOKIE);

  if (!hasToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
