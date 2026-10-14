import "server-only";
import type { Event } from "@kokka/db";
import { cookies } from "next/headers";
import { DEVICE_COOKIE, isDeviceId } from "./device";
import { getGuestEvent } from "./guest";
import { UploadError } from "./uploads";

/** Event and device behind a guest API request; throws UploadError when either is missing. */
export async function guestContext(slug: string): Promise<{ event: Event; deviceId: string }> {
  const event = await getGuestEvent(slug);
  if (!event) throw new UploadError("Evento não encontrado.", 404);
  const deviceId = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!isDeviceId(deviceId)) {
    throw new UploadError("Abra o link do evento de novo para enviar.", 400);
  }
  return { event, deviceId };
}

/** Runs a guest API handler and turns UploadError into its JSON response. */
export async function guestJson(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof UploadError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
