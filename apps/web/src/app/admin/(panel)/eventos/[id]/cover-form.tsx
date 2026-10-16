"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ChangeEvent } from "react";
import { buttonClassName } from "@/components/admin/button";

interface CoverFormProps {
  eventId: string;
  coverUrl: string | null;
}

export function CoverForm({ eventId, coverUrl }: CoverFormProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const busy = uploading || refreshing;

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/eventos/${eventId}/cover`, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Não foi possível enviar a capa. Tente de novo.");
        return;
      }
      startRefresh(() => {
        router.refresh();
      });
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  return (
    <div className="flex flex-col items-start gap-4 rounded-[22px] border-2 border-b-[6px] border-line bg-white p-4.5 sm:p-6">
      <h2 className="text-[19px] font-black">Foto de capa</h2>
      {coverUrl ? (
        // Signed, short-lived URL to a private bucket: next/image cannot optimize or cache it.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt="Capa do evento"
          className="aspect-video w-full rounded-[18px] object-cover"
        />
      ) : (
        <p className="text-[15px] font-bold text-ink-soft">Sem foto, a capa usa a cor do evento.</p>
      )}
      <label
        className={buttonClassName({
          variant: "outline",
          className:
            "cursor-pointer has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-brand-strong has-disabled:cursor-wait has-disabled:opacity-60",
        })}
      >
        {busy ? "Enviando…" : coverUrl ? "Trocar capa" : "Enviar capa"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => void upload(event)}
          className="sr-only"
        />
      </label>
      <p className="text-sm font-bold text-ink-soft">JPEG, PNG ou WebP, até 15 MB.</p>
      {error && (
        <p role="alert" className="text-sm font-extrabold text-brand-edge">
          {error}
        </p>
      )}
    </div>
  );
}
