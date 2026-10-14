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
import { transitionEventAction, updateEventAction, updateThemeAction } from "../actions";
import { EventForm } from "../event-form";
import { StatusControl } from "./status-control";
import { ThemeForm } from "./theme-form";

export const metadata: Metadata = { title: "Evento · Kokka" };

export default async function EventPage({ params }: PageProps<"/admin/eventos/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const next = nextAdminStatus(event.status);

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
        <p className="text-sm text-stone-600">Link dos convidados: /e/{event.slug}</p>
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
