import { useSyncExternalStore } from "react";

/**
 * Object URLs of files this guest picked in the current page session, by media id. The uploader
 * fills it; the "Enviados por você" strip reads it to show the photo while it is processing.
 * Lost on reload, when the strip falls back to icons.
 */
let previews: ReadonlyMap<string, string> = new Map();
const listeners = new Set<() => void>();

export function setLocalPreview(mediaId: string, url: string): void {
  previews = new Map(previews).set(mediaId, url);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const EMPTY: ReadonlyMap<string, string> = new Map();

export function useLocalPreviews(): ReadonlyMap<string, string> {
  return useSyncExternalStore(
    subscribe,
    () => previews,
    () => EMPTY,
  );
}
