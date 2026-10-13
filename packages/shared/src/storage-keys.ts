/** Object keys in the media bucket. Everything for an event lives under `events/{eventId}/`. */
export const storageKeys = {
  eventPrefix: (eventId: string) => `events/${eventId}/`,
  cover: (eventId: string, coverId: string) => `events/${eventId}/cover/${coverId}.webp`,
  original: (eventId: string, mediaId: string, ext: string) =>
    `events/${eventId}/original/${mediaId}.${sanitizeExt(ext)}`,
  thumb: (eventId: string, mediaId: string) => `events/${eventId}/thumb/${mediaId}.webp`,
  display: (eventId: string, mediaId: string, ext: "jpg" | "mp4") =>
    `events/${eventId}/display/${mediaId}.${ext}`,
};

function sanitizeExt(ext: string): string {
  const clean = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
  return clean || "bin";
}
