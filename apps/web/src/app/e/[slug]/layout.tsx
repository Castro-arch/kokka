import { MAX_VIDEO_DURATION_MS, UPLOAD_PART_SIZE_BYTES } from "@kokka/shared";
import { notFound } from "next/navigation";
import { getGuestEvent } from "@/lib/guest";
import { GuestNav } from "./guest-nav";
import { UploadProvider } from "./upload-context";

/**
 * Guest area of an event: keeps uploads alive across its pages (send, gallery, my uploads) and
 * shows the bottom navigation while the event still has photos.
 */
export default async function GuestEventLayout({ children, params }: LayoutProps<"/e/[slug]">) {
  const { slug } = await params;
  const event = await getGuestEvent(slug);
  if (!event) notFound();

  return (
    <UploadProvider
      slug={slug}
      partSizeBytes={UPLOAD_PART_SIZE_BYTES}
      maxVideoDurationMs={MAX_VIDEO_DURATION_MS}
    >
      <div className="min-h-dvh bg-white pb-28">{children}</div>
      {event.status !== "expired" && <GuestNav slug={slug} />}
    </UploadProvider>
  );
}
