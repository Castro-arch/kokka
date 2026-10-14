import "server-only";
import type { Event } from "@kokka/db";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { readableTextColor } from "@/lib/color";
import { DEVICE_COOKIE, isDeviceId } from "@/lib/device";
import { resolveTheme } from "@/lib/event-display";
import { FONT_CLASS_NAMES } from "@/lib/fonts";
import { getGuestEvent } from "@/lib/guest";

export interface GuestPage {
  event: Event;
  /** Event theme color; the guest header is always painted with it. */
  color: string;
  /** Text color legible on `color`. */
  onColor: string;
  /** Theme font class, for the event name. */
  fontClass: string;
  /** This phone's anonymous id, when it already has the cookie. */
  deviceId?: string;
}

/** What every guest page needs: the event (404 for unknown or draft) and its theme. */
export async function loadGuestPage(slug: string): Promise<GuestPage> {
  const event = await getGuestEvent(slug);
  if (!event) notFound();
  const theme = resolveTheme(event.theme);
  const deviceId = (await cookies()).get(DEVICE_COOKIE)?.value;
  return {
    event,
    color: theme.primaryColor,
    onColor: readableTextColor(theme.primaryColor),
    fontClass: FONT_CLASS_NAMES[theme.font],
    deviceId: isDeviceId(deviceId) ? deviceId : undefined,
  };
}

/** Private events: keep them out of search engines and link previews generic. */
export async function guestMetadata(slug: string, page?: string): Promise<Metadata> {
  const event = await getGuestEvent(slug);
  const title = event ? [page, event.name, "Kokka"].filter(Boolean).join(" · ") : "Kokka";
  return { title, robots: { index: false } };
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
