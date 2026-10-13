import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-guard";
import { createEventAction } from "../actions";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "Novo evento · Kokka" };

export default async function NewEventPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/eventos" className="text-sm text-stone-600 hover:underline">
          ← Eventos
        </Link>
        <h1 className="text-2xl font-semibold">Novo evento</h1>
      </div>
      <EventForm action={createEventAction} submitLabel="Criar evento" />
    </div>
  );
}
