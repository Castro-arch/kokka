"use client";

import { useEffect, useState } from "react";
import { buttonClassName } from "@/components/admin/button";

/** Copies the guest link and says so for a moment. */
export function CopyLinkButton({ url, className = "" }: { url: string; className?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => {
      setStatus("idle");
    }, 2500);
    return () => {
      clearTimeout(timer);
    };
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={buttonClassName({ variant: "outline", className })}
    >
      <span aria-live="polite">
        {status === "copied"
          ? "Link copiado!"
          : status === "failed"
            ? "Não deu para copiar"
            : "Copiar link"}
      </span>
    </button>
  );
}
