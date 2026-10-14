import "server-only";
import { createStorage, type Storage } from "@kokka/shared/storage";
import { getEnv } from "./env";

// Reuse the client across hot reloads in development.
const globalForStorage = globalThis as unknown as { kokkaStorage?: Storage };

export function getStorage(): Storage {
  globalForStorage.kokkaStorage ??= createStorage(getEnv());
  return globalForStorage.kokkaStorage;
}
