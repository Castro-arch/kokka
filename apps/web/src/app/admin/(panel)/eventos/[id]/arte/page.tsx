import { redirect } from "next/navigation";

/** The print card is now the "QR e arte" tab of the event page. */
export default async function PrintCardRedirect({ params }: PageProps<"/admin/eventos/[id]/arte">) {
  const { id } = await params;
  redirect(`/admin/eventos/${encodeURIComponent(id)}?aba=qr`);
}
