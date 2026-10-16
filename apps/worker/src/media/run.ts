import { execFile } from "node:child_process";

/** A tool the worker image must ship (ffmpeg, ffprobe, heif-dec) is not installed. */
export class MissingToolError extends Error {
  override name = "MissingToolError";
}

/**
 * Runs a command and resolves with its stdout. Failures carry the end of stderr, which is where
 * ffmpeg and heif-dec explain what went wrong.
 */
export function run(command: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (!error) {
          resolve(stdout);
          return;
        }
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          reject(new MissingToolError(`${command} is not installed`));
          return;
        }
        const detail = stderr.trim().slice(-800) || error.message;
        reject(new Error(`${command} failed: ${detail}`, { cause: error }));
      },
    );
  });
}
