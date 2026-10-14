import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { nunito } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kokka",
  description: "Fotos e vídeos do seu evento, ao vivo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={nunito.variable}>
      <body className="min-h-dvh bg-block font-sans font-semibold text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
