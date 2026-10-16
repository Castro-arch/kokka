import { DEFAULT_THEME, EVENT_RETENTION_DAYS, FONT_OPTIONS } from "@kokka/shared";
import type { Metadata } from "next";
import { ColorSwatches } from "@/components/admin/color-swatches";
import { Field, fieldClassName } from "@/components/admin/field";
import { SegmentedControl } from "@/components/admin/segmented-control";
import { ClockIcon } from "@/components/icons";
import { requireAdmin } from "@/lib/auth-guard";
import { AccountCard } from "./account-card";

export const metadata: Metadata = { title: "Configurações · Kokka" };

/** The notice the inert defaults point at, instead of a badge on each control. */
const DEFAULTS_NOTICE = "defaults-soon";

/** Settings (docs/design/admin/configuracoes.html): the account, and defaults for new events. */
export default async function SettingsPage({ searchParams }: PageProps<"/admin/configuracoes">) {
  const { user } = await requireAdmin();
  const { senha } = await searchParams;

  return (
    <div className="flex flex-col gap-5.5">
      <h1 className="text-[32px] font-black">Configurações</h1>

      <div className="flex max-w-[1080px] flex-wrap items-start gap-5.5">
        <AccountCard name={user.name} email={user.email} passwordChanged={senha === "trocada"} />

        <section
          aria-labelledby="defaults-title"
          className="flex flex-[1_1_408px] flex-col gap-4.5 rounded-3xl border-2 border-b-[6px] border-line bg-white p-5.5"
        >
          <div className="flex flex-col gap-0.5">
            <h2 id="defaults-title" className="text-[21px] font-black">
              Padrões para novos eventos
            </h2>
            <span className="text-sm font-bold text-ink-soft">Cada evento pode mudar depois.</span>
          </div>

          <p
            id={DEFAULTS_NOTICE}
            className="flex items-center gap-2.5 rounded-2xl border-2 border-b-4 border-sun-line bg-sun-soft px-3.5 py-2.5 text-sm font-extrabold text-sun-text"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
            <img src="/brand/mascot.png" alt="" className="h-7 w-9 shrink-0 object-contain" />
            Os padrões chegam numa próxima etapa.
          </p>

          <ColorSwatches
            name="primaryColor"
            label="Cor do evento"
            value={DEFAULT_THEME.primaryColor}
            soon
            hideBadge
            describedBy={DEFAULTS_NOTICE}
          />

          <Field label="Fonte do título">
            <select
              name="font"
              defaultValue={DEFAULT_THEME.font}
              disabled
              aria-describedby={DEFAULTS_NOTICE}
              className={`${fieldClassName} px-3.5`}
            >
              {FONT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <SegmentedControl
            label="Tempo de cada foto no telão"
            name="photoSeconds"
            defaultValue="8"
            soon
            hideBadge
            describedBy={DEFAULTS_NOTICE}
            options={[
              { value: "5", label: "5 s" },
              { value: "8", label: "8 s" },
              { value: "12", label: "12 s" },
            ]}
          />

          <p className="flex items-start gap-3 rounded-[18px] border-2 border-b-[5px] border-sun-line bg-sun-soft p-3.5 text-sm leading-[1.4] font-extrabold text-sun-text">
            <ClockIcon className="h-6 w-6 shrink-0" strokeWidth={2.4} />
            Depois que o evento encerra, fotos e vídeos ficam {EVENT_RETENTION_DAYS} dias para
            baixar. Depois disso, tudo é apagado.
          </p>
        </section>
      </div>
    </div>
  );
}
