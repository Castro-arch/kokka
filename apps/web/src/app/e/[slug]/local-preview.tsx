"use client";

import type { MediaKind } from "@kokka/shared";
import { useState } from "react";
import { CameraIcon, VideoIcon } from "@/components/icons";

/**
 * Thumbnail of a file still on the phone (an object URL), before the server has one. Falls back
 * to an icon when the browser cannot render the file (HEIC outside Safari, some videos).
 */
export function LocalPreview({
  url,
  kind,
  className = "",
}: {
  url?: string;
  kind: MediaKind;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const box = `overflow-hidden bg-stone-200 text-stone-500 ${className}`;

  if (!url || failed) {
    const Icon = kind === "video" ? VideoIcon : CameraIcon;
    return (
      <span className={`flex items-center justify-center ${box}`}>
        <Icon className="h-1/2 w-1/2" />
      </span>
    );
  }
  if (kind === "video") {
    // #t=0.1 makes Safari show a frame instead of a blank box.
    return (
      <video
        src={`${url}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        onError={() => {
          setFailed(true);
        }}
        className={`object-cover ${box}`}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local object URL, never optimized
    <img
      src={url}
      alt=""
      onError={() => {
        setFailed(true);
      }}
      className={`object-cover ${box}`}
    />
  );
}
