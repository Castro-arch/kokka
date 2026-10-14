import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE, deviceCookie, isDeviceId } from "./lib/device";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/e/") || pathname.startsWith("/api/e/")) return guest(request);
  return admin(request);
}

/** Guest routes need no login; they only get an anonymous device cookie on the first visit. */
function guest(request: NextRequest) {
  const response = NextResponse.next();
  if (!isDeviceId(request.cookies.get(DEVICE_COOKIE)?.value)) {
    // TLS ends at the reverse proxy, so the app itself is reached over http in production.
    const secure =
      request.nextUrl.protocol === "https:" ||
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https";
    response.cookies.set(deviceCookie(crypto.randomUUID(), secure));
  }
  return response;
}

/**
 * Fast path only: bounces requests without a session cookie. The real check (valid, unexpired
 * session) is `requireAdmin` / `requireAdminApi` in every page, Server Action and Route Handler.
 */
function admin(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login" || getSessionCookie(request)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/e/:path*", "/api/e/:path*"],
};
