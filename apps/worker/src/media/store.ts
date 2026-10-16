import { and, eq, media, type Database } from "@kokka/db";
import type { MediaStore } from "./process-media.ts";

/** The worker's media queries. Status changes only apply to media still processing. */
export function createMediaStore(db: Database): MediaStore {
  const stillProcessing = (id: string) => and(eq(media.id, id), eq(media.status, "processing"));

  return {
    async find(id) {
      const [row] = await db
        .select({
          id: media.id,
          eventId: media.eventId,
          kind: media.kind,
          status: media.status,
          originalKey: media.originalKey,
          originalMime: media.originalMime,
        })
        .from(media)
        .where(eq(media.id, id));
      return row;
    },

    async markReady(id, fields) {
      const updated = await db
        .update(media)
        .set({ status: "ready", ...fields })
        .where(stillProcessing(id))
        .returning({ id: media.id });
      return updated.length > 0;
    },

    async markFailed(id) {
      const updated = await db
        .update(media)
        .set({ status: "failed" })
        .where(stillProcessing(id))
        .returning({ id: media.id });
      return updated.length > 0;
    },
  };
}
