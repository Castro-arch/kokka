import { MAX_VIDEO_DURATION_MS, UPLOAD_PART_SIZE_BYTES } from "@kokka/shared";
import { UploadProvider } from "./upload-context";

/** Keeps the guest's uploads alive across the event pages (send, gallery, my uploads). */
export default async function GuestEventLayout({ children, params }: LayoutProps<"/e/[slug]">) {
  const { slug } = await params;
  return (
    <UploadProvider
      slug={slug}
      partSizeBytes={UPLOAD_PART_SIZE_BYTES}
      maxVideoDurationMs={MAX_VIDEO_DURATION_MS}
    >
      {children}
    </UploadProvider>
  );
}
