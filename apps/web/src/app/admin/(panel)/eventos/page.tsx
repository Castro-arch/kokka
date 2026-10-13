import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { formatDateTime, STATUS_BADGE_CLASSES, STATUS_LABELS } from "@/lib/event-display";
import { listEvents } from "@/lib/events";

export const metadata: Metadata = { title: "Eventos · Kokka" };

export default async function EventsPage() {
  await requireAdmin();
  const events = await listEvents();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Eventos</h1>
        <Link href="/admin/eventos/novo" className="btn-primary">
          Novo evento
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-stone-600 ring-1 ring-stone-200">
          Nenhum evento ainda. Crie o primeiro para gerar o QR Code das mesas.
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-2xl bg-white ring-1 ring-stone-200">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/admin/eventos/${event.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-stone-50"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">{event.name}</p>
                  <p className="text-sm text-stone-600">
                    {formatDateTime(event.startsAt)} · /e/{event.slug}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[event.status]}`}
                >
                  {STATUS_LABELS[event.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
