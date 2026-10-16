/**
 * The upload itself is the problem (corrupt, not a video, too long, an image the worker cannot
 * decode): trying again would fail the same way, so the job gives up at once and the media is
 * marked failed. Any other error is retried.
 */
export class InvalidMediaError extends Error {
  override name = "InvalidMediaError";
}
