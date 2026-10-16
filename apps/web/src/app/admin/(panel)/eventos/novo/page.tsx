import { DEFAULT_THEME } from "@kokka/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "@/components/icons";
import { requireAdmin } from "@/lib/auth-guard";
import { FONT_CLASS_NAMES } from "@/lib/fonts";
import { createEventAction } from "../actions";
import { NewEventForm } from "./new-event-form";

export const metadata: Metadata = { title: "Novo evento · Kokka" };

/** Create an event, in the admin look; color, cover and the QR come after, on its page. */
export default async function NewEventPage() {
  await requireAdmin();

  return (
    <div className="flex max-w-[1000px] flex-col gap-5.5">
      <Link
        href="/admin"
        className="flex items-center gap-1.5 self-start rounded-lg text-[15px] font-black text-brand-strong no-underline hover:text-brand-dark"
      >
        <ChevronLeftIcon className="h-4.5 w-4.5" strokeWidth={2.8} />
        Eventos
      </Link>
      <div className="flex flex-col gap-0.5">
        <h1 className="text-[32px] font-black">Novo evento</h1>
        <p className="text-[15px] font-bold text-ink-soft">
          Depois de criar, você escolhe a cor, a capa e imprime o QR das mesas.
        </p>
      </div>
      <NewEventForm
        action={createEventAction}
        color={DEFAULT_THEME.primaryColor}
        fontClassName={FONT_CLASS_NAMES[DEFAULT_THEME.font]}
      />
    </div>
  );
}
