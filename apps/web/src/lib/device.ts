/**
 * Anonymous guest device id: a random cookie set on the first visit to a guest page. It ties
 * uploads to the phone that sent them (own uploads list, rate limit) without any login.
 * No `server-only`: the proxy imports it too.
 */
export const DEVICE_COOKIE = "kokka_device";

const DEVICE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const DEVICE_ID = /^[0-9a-f-]{36}$/;

export function isDeviceId(value: string | undefined): value is string {
  return value !== undefined && DEVICE_ID.test(value);
}

export function deviceCookie(id: string, secure: boolean) {
  return {
    name: DEVICE_COOKIE,
    value: id,
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE_SECONDS,
  };
}

/** Client IP as seen by the reverse proxy (Coolify/Traefik), for rate limiting only. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
