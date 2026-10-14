"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ChangeEvent } from "react";

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
    <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
      {coverUrl ? (
        // Signed, short-lived URL to a private bucket: next/image cannot optimize or cache it.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt="Capa do evento"
          className="aspect-video w-full rounded-xl object-cover"
        />
      ) : (
        <p className="text-sm text-stone-600">Nenhuma capa ainda.</p>
      )}
      <label className="btn-secondary cursor-pointer has-disabled:cursor-wait has-disabled:opacity-60">
        {busy ? "Enviando…" : coverUrl ? "Trocar capa" : "Enviar capa"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => void upload(event)}
          className="sr-only"
        />
      </label>
      <p className="text-xs text-stone-500">JPEG, PNG ou WebP, até 15 MB.</p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
