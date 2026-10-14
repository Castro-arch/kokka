"use client";

import type { AwsBody } from "@uppy/aws-s3";
import type { Meta, Uppy } from "@uppy/core";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CameraIcon, CheckIcon, ImagesIcon, VideoIcon } from "./icons";
import { LocalPreview } from "./local-preview";
import { setLocalPreview } from "./local-previews";

interface UploadMeta extends Meta {
  mediaId: string;
  key: string;
}

type GuestUppy = Uppy<UploadMeta, AwsBody>;

interface Item {
  id: string;
  kind: "image" | "video";
  /** "Foto 1", "Vídeo 2"…: file names can be long or personal, so they are not shown. */
  label: string;
  /** Object URL of the file on the phone, for the thumbnail. */
  previewUrl: string;
  /** 0–100 while sending. */
  percent: number;
  state: "sending" | "done" | "error";
  message?: string;
  uppyId?: string;
}

interface GuestUploaderProps {
  slug: string;
  partSizeBytes: number;
  maxVideoDurationMs: number;
  color: string;
  onColor: string;
}

/**
 * Photo/video picker and upload progress for guests. Uppy is only downloaded when the guest picks
 * a file, keeping the gallery page light; each original goes to storage as a multipart upload
 * whose requests the app presigns.
 */
export function GuestUploader({
  slug,
  partSizeBytes,
  maxVideoDurationMs,
  color,
  onColor,
}: GuestUploaderProps) {
  const router = useRouter();
  const uppyRef = useRef<Promise<GuestUppy> | null>(null);
  // List key until the server returns the media id. Not crypto.randomUUID: it only exists in
  // secure contexts (missing on plain-http LAN testing) and on Safari 15.4+.
  const localIds = useRef(0);
  const counts = useRef({ image: 0, video: 0 });
  const previewUrls = useRef<string[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const sending = items.some((item) => item.state === "sending");

  const update = (id: string, patch: Partial<Item>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  // Leaving mid-upload loses it; let the browser ask first.
  useEffect(() => {
    if (!sending) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [sending]);

  useEffect(
    () => () => {
      void uppyRef.current?.then((uppy) => {
        uppy.destroy();
      });
      for (const url of previewUrls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  function getUppy(): Promise<GuestUppy> {
    uppyRef.current ??= createUppy();
    return uppyRef.current;
  }

  async function createUppy(): Promise<GuestUppy> {
    const [{ default: UppyCore }, { default: AwsS3 }] = await Promise.all([
      import("@uppy/core"),
      import("@uppy/aws-s3"),
    ]);
    const uppy: GuestUppy = new UppyCore<UploadMeta, AwsBody>({ autoProceed: true });
    uppy.use(AwsS3, {
      shouldUseMultipart: true,
      getChunkSize: () => partSizeBytes,
      limit: 3,
      generateObjectKey: (file) => String(file.meta.key),
      signRequest: async (request) => {
        // The key is events/{eventId}/original/{mediaId}.{ext}.
        const mediaId = request.key.split("/").pop()?.split(".")[0] ?? "";
        const response = await fetch(`/api/e/${slug}/uploads/${mediaId}/sign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });
        if (!response.ok) throw new Error(await errorMessage(response));
        return (await response.json()) as { url: string; headers?: Record<string, string> };
      },
    });

    uppy.on("upload-progress", (file, progress) => {
      if (!file || !progress.bytesTotal) return;
      const percent = Math.round((progress.bytesUploaded / progress.bytesTotal) * 100);
      update(file.meta.mediaId, { percent: Math.min(percent, 99) });
    });
    uppy.on("upload-success", (file) => {
      if (!file) return;
      void finish(file.meta.mediaId);
    });
    uppy.on("upload-error", (file, error) => {
      if (!file) return;
      update(file.meta.mediaId, {
        state: "error",
        message: error.message || "O envio falhou.",
      });
    });
    return uppy;
  }

  async function finish(mediaId: string) {
    const response = await fetch(`/api/e/${slug}/uploads/${mediaId}/complete`, { method: "POST" });
    if (!response.ok) {
      update(mediaId, { state: "error", message: await errorMessage(response) });
      return;
    }
    update(mediaId, { state: "done", percent: 100 });
    router.refresh();
  }

  async function send(file: File) {
    localIds.current += 1;
    const localId = `local-${String(localIds.current)}`;
    const kind = isVideo(file) ? "video" : "image";
    counts.current[kind] += 1;
    const label = `${kind === "video" ? "Vídeo" : "Foto"} ${String(counts.current[kind])}`;
    const previewUrl = URL.createObjectURL(file);
    previewUrls.current.push(previewUrl);
    setItems((current) => [
      { id: localId, kind, label, previewUrl, percent: 0, state: "sending" },
      ...current,
    ]);

    const durationMs = kind === "video" ? await videoDurationMs(file) : undefined;
    if (durationMs !== undefined && durationMs > maxVideoDurationMs) {
      update(localId, { state: "error", message: "Vídeos podem ter até 3 minutos." });
      return;
    }

    const response = await fetch(`/api/e/${slug}/uploads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, type: file.type, size: file.size, durationMs }),
    });
    if (!response.ok) {
      update(localId, { state: "error", message: await errorMessage(response) });
      return;
    }
    const { mediaId, key } = (await response.json()) as { mediaId: string; key: string };
    // From here on the item is tracked by its media id, which Uppy events carry.
    update(localId, { id: mediaId });
    setLocalPreview(mediaId, previewUrl);

    try {
      const uppy = await getUppy();
      const uppyId = uppy.addFile({
        name: file.name,
        type: file.type,
        data: file,
        meta: { mediaId, key },
      });
      update(mediaId, { uppyId });
    } catch {
      update(mediaId, { state: "error", message: "Não foi possível iniciar o envio." });
    }
  }

  async function retry(item: Item) {
    if (!item.uppyId) return;
    update(item.id, { state: "sending", message: undefined });
    await (await getUppy()).retryUpload(item.uppyId);
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    for (const file of files) void send(file);
  }

  const button =
    "flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-xl px-3 py-3 text-center text-sm font-semibold focus-within:outline-2 focus-within:outline-offset-2";

  return (
    <section className="mt-5 px-4" aria-labelledby="upload-title">
      <h2 id="upload-title" className="sr-only">
        Enviar fotos e vídeos
      </h2>
      <div className="flex gap-2">
        <label
          className={button}
          style={{ backgroundColor: color, color: onColor, outlineColor: color }}
        >
          <CameraIcon className="h-7 w-7" />
          Tirar foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={onPick}
          />
        </label>
        <label
          className={button}
          style={{ backgroundColor: color, color: onColor, outlineColor: color }}
        >
          <VideoIcon className="h-7 w-7" />
          Gravar vídeo
          <input
            type="file"
            accept="video/*"
            capture="environment"
            className="sr-only"
            onChange={onPick}
          />
        </label>
        <label
          className={`${button} border border-stone-300 bg-white text-stone-800`}
          style={{ outlineColor: color }}
        >
          <ImagesIcon className="h-7 w-7" />
          Da galeria
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="sr-only"
            onChange={onPick}
          />
        </label>
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg bg-stone-100 p-2 text-sm"
            >
              <LocalPreview
                url={item.previewUrl}
                kind={item.kind}
                className="h-12 w-12 shrink-0 rounded-md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-stone-800">{item.label}</span>
                  <span className="shrink-0 text-stone-600">
                    {item.state === "sending" && `${item.percent}%`}
                    {item.state === "done" && (
                      <span className="inline-flex items-center gap-1">
                        Enviado <CheckIcon className="h-4 w-4" />
                      </span>
                    )}
                    {item.state === "error" && item.uppyId && (
                      <button
                        type="button"
                        onClick={() => void retry(item)}
                        className="font-semibold underline"
                      >
                        Tentar de novo
                      </button>
                    )}
                  </span>
                </div>
                {item.state === "sending" && (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{ width: `${item.percent}%`, backgroundColor: color }}
                    />
                  </div>
                )}
                {item.state === "done" && (
                  <p className="mt-0.5 text-xs text-stone-600">
                    Aparece na galeria assim que ficar pronto.
                  </p>
                )}
                {item.message && <p className="mt-0.5 text-xs text-red-700">{item.message}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Some phones report no type for videos (MOV); the extension tells. */
function isVideo(file: File): boolean {
  return file.type.startsWith("video/") || /\.(mov|mp4|m4v|webm)$/i.test(file.name);
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    // Not our JSON error (network, proxy): fall through to the generic message.
  }
  return "O envio falhou. Tente de novo.";
}

/** Duration from the file's own metadata; undefined when the browser cannot read it. */
function videoDurationMs(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (value: number | undefined) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timeout = window.setTimeout(() => {
      done(undefined);
    }, 5000);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      done(Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : undefined);
    };
    video.onerror = () => {
      window.clearTimeout(timeout);
      done(undefined);
    };
    video.src = url;
  });
}
