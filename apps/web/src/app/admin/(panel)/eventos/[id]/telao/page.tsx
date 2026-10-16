import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/admin/button";
import { MediaThumb } from "@/components/admin/media-thumb";
import { ProjectorPreview } from "@/components/admin/projector-preview";
import { displayUrl } from "@/components/admin/qr-card";
import { SegmentedControl } from "@/components/admin/segmented-control";
import { SOON_CONTROL } from "@/components/admin/soon";
import { Switch } from "@/components/admin/switch";
import { EyeOffIcon, ExpandIcon, PauseIcon, SkipIcon } from "@/components/icons";
import { projectorQueue } from "@/lib/admin-media";
import { requireAdmin } from "@/lib/auth-guard";
import { getEvent } from "@/lib/events";
import { guestUrl, qrSvg } from "@/lib/qr";
import { isNew, queueLabel } from "@/lib/telao-queue";

export const metadata: Metadata = { title: "Telão · Kokka" };

/** On screen plus the next four, like the mockup's "Próximas". */
const QUEUE_SIZE = 5;

/** The notice every inert control of this screen points at, instead of a badge on each. */
const SOON_NOTICE = "telao-soon";

/**
 * Projector control (docs/design/admin/telao.html). The player itself comes in step 5: for now
 * the preview shows what the loop would play; the controls are visible, inert and explained by
 * one notice at the top.
 */
export default async function ProjectorPage({ params }: PageProps<"/admin/eventos/[id]/telao">) {
  await requireAdmin();
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const link = guestUrl(event.slug);
  const [queue, qr] = await Promise.all([projectorQueue(event.id, QUEUE_SIZE), qrSvg(link)]);
  const [current, ...next] = queue.items;
  const now = new Date();
  const fresh = next.filter((item) => isNew(item, now)).length;
  const live = event.status === "active";

  return (
    <div className="flex flex-col gap-5.5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[32px] font-black">Telão</h1>
          <span className="text-[15px] font-extrabold text-ink-soft">
            <Link
              href={`/admin/eventos/${event.id}`}
              className="text-ink-soft no-underline hover:text-ink hover:underline"
            >
              {event.name}
            </Link>{" "}
            · {live ? "prévia do loop" : "o telão funciona com o evento ativo"}
          </span>
        </div>
        <Button size="lg" soon hideBadge describedBy={SOON_NOTICE} className="h-14 px-6">
          <ExpandIcon className="h-5.5 w-5.5" strokeWidth={2.6} />
          Abrir em tela cheia
        </Button>
      </div>

      <p
        id={SOON_NOTICE}
        className="flex items-center gap-3 rounded-[18px] border-2 border-b-[5px] border-sun-line bg-sun-soft px-4 py-3 text-[15px] font-extrabold text-sun-text"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
        <img src="/brand/mascot.png" alt="" className="h-9 w-11.5 shrink-0 object-contain" />O
        controle do telão chega na próxima etapa. Por enquanto você vê a prévia e a fila.
      </p>

      <div className="flex flex-wrap items-start gap-5.5">
        {/* Capped by the window height too, so the controls stay visible without scrolling. */}
        <div className="flex max-w-[calc((100dvh-325px)*16/9)] min-w-0 flex-[999_1_460px] flex-col gap-4">
          <ProjectorPreview
            current={current}
            position={1}
            total={queue.total}
            eventName={event.name}
            qrSvg={qr}
            link={displayUrl(link)}
          />
          <div className="grid grid-cols-3 gap-3">
            <ControlButton
              icon={<PauseIcon className="h-6.5 w-6.5" />}
              className="border-b-[6px] border-sun-edge bg-sun text-sun-ink"
            >
              Pausar
            </ControlButton>
            <ControlButton
              icon={<SkipIcon className="h-6.5 w-6.5" />}
              className="border-2 border-b-[6px] border-line bg-white text-ink"
            >
              Pular
            </ControlButton>
            <ControlButton
              icon={<EyeOffIcon className="h-6.5 w-6.5" strokeWidth={2.4} />}
              className="border-2 border-b-[6px] border-active-line bg-active text-brand-edge"
            >
              Ocultar esta
            </ControlButton>
          </div>
        </div>

        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
          <section
            aria-labelledby="settings-title"
            className="flex flex-col gap-4 rounded-[22px] border-2 border-b-[6px] border-line bg-white p-4.5"
          >
            <h2 id="settings-title" className="text-[19px] font-black">
              Ajustes
            </h2>
            <SegmentedControl
              label="Tempo de cada foto"
              name="photoSeconds"
              defaultValue="8"
              soon
              hideBadge
              describedBy={SOON_NOTICE}
              options={[
                { value: "5", label: "5 s" },
                { value: "8", label: "8 s" },
                { value: "12", label: "12 s" },
              ]}
            />
            <Switch
              name="newFirst"
              label="Novas primeiro"
              hint="Entram logo depois da atual"
              defaultChecked
              soon
              hideBadge
              describedBy={SOON_NOTICE}
            />
            <Switch
              name="qrCorner"
              label="QR no canto"
              hint="Lembra os convidados de enviar"
              soon
              hideBadge
              describedBy={SOON_NOTICE}
            />
          </section>

          <section
            aria-labelledby="next-title"
            className="flex flex-col gap-2.5 rounded-[22px] border-2 border-b-[6px] border-line bg-white p-4.5"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="next-title" className="text-[19px] font-black">
                Próximas
              </h2>
              {fresh > 0 && (
                <span className="rounded-full bg-sun px-2.25 py-0.75 text-xs font-black text-sun-ink">
                  {fresh === 1 ? "1 nova" : `${String(fresh)} novas`}
                </span>
              )}
            </div>
            {next.length > 0 ? (
              <ol className="flex flex-col gap-2.5">
                {next.map((item) => {
                  const itemIsNew = isNew(item, now);
                  return (
                    <li key={item.id} className="flex items-center gap-2.5">
                      <MediaThumb item={item} className="w-13.5 shrink-0 rounded-xl" />
                      <span
                        className={`flex-1 text-sm font-extrabold ${itemIsNew ? "" : "text-ink-soft"}`}
                      >
                        {queueLabel(item, now)}
                      </span>
                      {itemIsNew && (
                        <span className="rounded-full bg-sun-soft px-2 py-0.75 text-xs font-black text-sun-ink">
                          Nova
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm font-bold text-ink-soft">
                {current
                  ? "Só tem esta por enquanto. As próximas aparecem aqui assim que ficarem prontas."
                  : "Nenhuma foto ainda. Enquanto isso, o telão mostra o QR para os convidados enviarem."}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/** Big projector control: icon over label, inert until step 5 (the notice says why). */
function ControlButton({
  icon,
  className,
  children,
}: {
  icon: ReactNode;
  className: string;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-describedby={SOON_NOTICE}
      className={`${SOON_CONTROL} flex h-[78px] w-full flex-col items-center justify-center gap-1 rounded-[20px] text-base font-black ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
