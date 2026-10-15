import type { Event } from "@kokka/db";
import { nextAdminStatus, toLocalDateTimeInput } from "@kokka/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClassName, ButtonLink } from "@/components/admin/button";
import { TAB_PANEL_ID } from "@/components/admin/event-tabs";
import { EventHeader } from "@/components/admin/event-header";
import { LifecycleSteps } from "@/components/admin/lifecycle-steps";
import { MediaThumb } from "@/components/admin/media-thumb";
import { displayUrl, QrCard } from "@/components/admin/qr-card";
import { StatTile } from "@/components/admin/stat-tile";
import { ChevronLeftIcon } from "@/components/icons";
import { recentMedia } from "@/lib/admin-media";
import { requireAdmin } from "@/lib/auth-guard";
import { resolveTheme } from "@/lib/event-display";
import { EMPTY_STATS, formatBytes, statsByEvent } from "@/lib/event-stats";
import { parseEventTab } from "@/lib/event-tabs";
import { getEvent } from "@/lib/events";
import { FONT_CLASS_NAMES } from "@/lib/fonts";
import { buildLifecycle } from "@/lib/lifecycle";
import { guestUrl, qrSvg } from "@/lib/qr";
import { getStorage } from "@/lib/storage";
import { transitionEventAction, updateEventAction, updateThemeAction } from "../actions";
import { EventForm } from "../event-form";
import { CoverForm } from "./cover-form";
import { StatusControl } from "./status-control";
import { ThemeForm } from "./theme-form";

export const metadata: Metadata = { title: "Evento · Kokka" };

/** Event page (docs/design/admin/evento.html): header with tabs; `?aba=` picks the tab. */
export default async function EventPage({
  params,
  searchParams,
}: PageProps<"/admin/eventos/[id]">) {
  await requireAdmin();
  const [{ id }, { aba }] = await Promise.all([params, searchParams]);
  const event = await getEvent(id);
  if (!event) notFound();

  const tab = parseEventTab(aba);
  const link = guestUrl(event.slug);
  const coverUrl = event.theme.coverKey
    ? await getStorage().signedGetUrl(event.theme.coverKey)
    : null;
  const next = nextAdminStatus(event.status);

  return (
    <div className="flex flex-col gap-5.5">
      <Link
        href="/admin"
        className="flex items-center gap-1.5 self-start rounded-lg text-[15px] font-black text-brand-strong no-underline hover:text-brand-dark"
      >
        <ChevronLeftIcon className="h-4.5 w-4.5" strokeWidth={2.8} />
        Eventos
      </Link>

      <EventHeader
        event={event}
        link={displayUrl(link)}
        coverUrl={coverUrl}
        tab={tab}
        actions={
          <>
            {event.status === "active" && (
              <ButtonLink variant="sun" href={`/admin/eventos/${event.id}/telao`}>
                Abrir telão
              </ButtonLink>
            )}
            {next && (
              <StatusControl
                eventName={event.name}
                next={next}
                action={transitionEventAction.bind(null, event.id, next)}
              />
            )}
          </>
        }
      />

      <div role="tabpanel" id={TAB_PANEL_ID} aria-labelledby={`event-tab-${tab}`}>
        {tab === "visao" && <Overview event={event} link={link} />}
        {tab === "personalizacao" && <Customization event={event} coverUrl={coverUrl} />}
        {tab === "qr" && <PrintTab event={event} link={link} />}
      </div>
    </div>
  );
}

async function Overview({ event, link }: { event: Event; link: string }) {
  const [stats, recent, qr] = await Promise.all([
    statsByEvent(event.id).then((all) => all.get(event.id) ?? EMPTY_STATS),
    recentMedia(event.id, 6),
    qrSvg(link),
  ]);
  const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

  return (
    <div className="flex flex-wrap items-start gap-5.5">
      <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-5.5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
          <StatTile value={String(stats.images)} label={plural(stats.images, "foto", "fotos")} />
          <StatTile value={String(stats.videos)} label={plural(stats.videos, "vídeo", "vídeos")} />
          <StatTile
            value={String(stats.devices)}
            label={plural(stats.devices, "aparelho", "aparelhos")}
          />
          <StatTile value={formatBytes(stats.bytes)} label="originais" />
        </div>

        <section
          aria-labelledby="recent-title"
          className="flex flex-col gap-3.5 rounded-[22px] border-2 border-b-[6px] border-line bg-white p-4.5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="recent-title" className="text-[19px] font-black">
              Chegando agora
            </h2>
            <Link
              href={`/admin/eventos/${event.id}/midias`}
              className="text-[15px] font-black text-brand-strong no-underline hover:text-brand-dark hover:underline"
            >
              Ver todas
            </Link>
          </div>
          {recent.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {recent.map((item) => (
                <MediaThumb key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-[15px] font-bold text-ink-soft">
              {event.status === "draft"
                ? "Quando o evento estiver ativo, as fotos e vídeos dos convidados aparecem aqui."
                : "Nenhum envio ainda."}
            </p>
          )}
        </section>

        <LifecycleSteps lifecycle={buildLifecycle(event)} />
      </div>

      <QrCard eventId={event.id} url={link} svg={qr} className="flex-[1_1_300px]" />
    </div>
  );
}

function Customization({ event, coverUrl }: { event: Event; coverUrl: string | null }) {
  if (event.status === "expired") {
    return (
      <p className="rounded-[22px] border-2 border-b-[6px] border-line bg-white p-4.5 text-[15px] font-bold text-ink-soft">
        Este evento expirou e não pode mais ser editado.
      </p>
    );
  }
  return (
    <div className="grid items-start gap-5.5 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <h2 className="text-[19px] font-black">Dados do evento</h2>
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
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="text-[19px] font-black">Aparência</h2>
        <ThemeForm
          action={updateThemeAction.bind(null, event.id)}
          initial={resolveTheme(event.theme)}
          fontClassNames={FONT_CLASS_NAMES}
          preview={{ name: event.name, subtitle: event.subtitle }}
        />
        <CoverForm eventId={event.id} coverUrl={coverUrl} />
      </div>
    </div>
  );
}

function PrintTab({ event, link }: { event: Event; link: string }) {
  const art = `/api/admin/eventos/${event.id}/arte`;
  return (
    <div className="flex flex-wrap items-start gap-5.5">
      <section
        aria-labelledby="art-title"
        className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 rounded-[22px] border-2 border-b-[6px] border-line bg-white p-4.5 sm:p-6"
      >
        <h2 id="art-title" className="text-[19px] font-black">
          Arte para impressão
        </h2>
        <p className="text-[15px] font-bold text-ink-soft">
          Cartão A6 (10,5 × 14,8 cm) em 300 dpi para as mesas. Imprima em tamanho real, sem ajustar
          à página. A arte usa o nome, o subtítulo e a cor atuais do evento.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <a href={`${art}?download=1`} download className={buttonClassName()}>
            Baixar arte (PNG)
          </a>
          <a
            href={`/api/admin/eventos/${event.id}/qr`}
            download
            className={buttonClassName({ variant: "outline" })}
          >
            Baixar só o QR (PNG)
          </a>
        </div>
        <p className="text-sm font-extrabold break-all text-ink-soft">{displayUrl(link)}</p>
      </section>
      {/* Generated on each request from the current name, subtitle and theme. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- authenticated API image, not optimizable */}
      <img
        src={art}
        alt={`Arte para impressão de ${event.name}`}
        width={1240}
        height={1748}
        className="w-full max-w-sm flex-[0_1_384px] rounded-[18px] border-2 border-b-[6px] border-line"
      />
    </div>
  );
}
