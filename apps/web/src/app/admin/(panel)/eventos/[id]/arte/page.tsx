import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { getEvent } from "@/lib/events";

export const metadata: Metadata = { title: "Arte para impressão · Kokka" };

export default async function PrintCardPage({ params }: PageProps<"/admin/eventos/[id]/arte">) {
  await requireAdmin();
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const src = `/api/admin/eventos/${event.id}/arte`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/admin/eventos/${event.id}`}
          className="text-sm text-stone-600 hover:underline"
        >
          ← {event.name}
        </Link>
        <h1 className="text-2xl font-semibold">Arte para impressão</h1>
        <p className="text-sm text-stone-600">
          Cartão A6 (10,5 × 14,8 cm) em 300 dpi para as mesas. Imprima em tamanho real, sem ajustar
          à página.
        </p>
      </div>
      <a href={`${src}?download=1`} download className="btn-primary">
        Baixar PNG
      </a>
      {/* Generated on each request from the current name, subtitle and theme. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- authenticated API image, not optimizable */}
      <img
        src={src}
        alt={`Arte para impressão de ${event.name}`}
        width={1240}
        height={1748}
        className="mx-auto w-full max-w-sm rounded-lg shadow-md ring-1 ring-stone-200"
      />
    </div>
  );
}
