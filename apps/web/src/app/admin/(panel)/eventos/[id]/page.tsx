import { nextAdminStatus, toLocalDateTimeInput } from "@kokka/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth-guard";
import {
  formatDateTime,
  resolveTheme,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
} from "@/lib/event-display";
import { getEvent } from "@/lib/events";
import { FONT_CLASS_NAMES } from "@/lib/fonts";
import { guestUrl, qrSvg } from "@/lib/qr";
import { getStorage } from "@/lib/storage";
import { transitionEventAction, updateEventAction, updateThemeAction } from "../actions";
import { EventForm } from "../event-form";
import { CoverForm } from "./cover-form";
import { StatusControl } from "./status-control";
import { ThemeForm } from "./theme-form";

export const metadata: Metadata = { title: "Evento · Kokka" };

export default async function EventPage({ params }: PageProps<"/admin/eventos/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const next = nextAdminStatus(event.status);
  const coverUrl = event.theme.coverKey
    ? await getStorage().signedGetUrl(event.theme.coverKey)
    : null;
  const link = guestUrl(event.slug);
  const qr = await qrSvg(link);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Link href="/admin/eventos" className="text-sm text-stone-600 hover:underline">
          ← Eventos
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{event.name}</h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[event.status]}`}
          >
            {STATUS_LABELS[event.status]}
          </span>
        </div>
      </div>

      <Section title="Status">
        <div className="space-y-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          {event.status === "closed" && (
            <p className="text-sm text-stone-600">
              Encerrado em {formatDateTime(event.closedAt)}. As mídias serão apagadas em{" "}
              {formatDateTime(event.expiresAt)}.
            </p>
          )}
          {event.status === "expired" && (
            <p className="text-sm text-stone-600">Evento expirado; as mídias foram apagadas.</p>
          )}
          {next && (
            <StatusControl next={next} action={transitionEventAction.bind(null, event.id, next)} />
          )}
        </div>
      </Section>

      <Section title="QR Code">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:flex-row">
          {/* SVG generated on the server by the qrcode library from our own URL. */}
          <div
            className="size-40 shrink-0 [&>svg]:size-full"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <div className="space-y-3 text-center sm:text-left">
            <p className="text-sm text-stone-600">
              Os convidados leem este código e caem direto na galeria do evento:
            </p>
            <p className="font-mono text-sm break-all">{link}</p>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <Link href={`/admin/eventos/${event.id}/arte`} className="btn-primary">
                Arte para impressão
              </Link>
              <a href={`/api/admin/eventos/${event.id}/qr`} download className="btn-secondary">
                Baixar QR (PNG)
              </a>
            </div>
          </div>
        </div>
      </Section>

      {event.status !== "expired" && (
        <Section title="Dados do evento">
          <EventForm
            action={updateEventAction.bind(null, event.id)}
            initialValues={{
              name: event.name,
              subtitle: event.subtitle ?? "",
              startsAt: event.startsAt ? toLocalDateTimeInput(event.startsAt) : "",
              endsAt: event.endsAt ? toLocalDateTimeInput(event.endsAt) : "",
            }}
            submitLabel="Salvar alterações"
          />
        </Section>
      )}

      {event.status !== "expired" && (
        <Section title="Personalização">
          <ThemeForm
            action={updateThemeAction.bind(null, event.id)}
            initial={resolveTheme(event.theme)}
            fontClassNames={FONT_CLASS_NAMES}
            preview={{ name: event.name, subtitle: event.subtitle }}
          />
        </Section>
      )}

      {event.status !== "expired" && (
        <Section title="Foto de capa">
          <CoverForm eventId={event.id} coverUrl={coverUrl} />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
