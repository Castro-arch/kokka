import type { FontKey } from "@kokka/shared";
import localFont from "next/font/local";

// Self-hosted from assets/fonts (OFL), the same files the print card renders with, so the build
// needs no network and the admin preview matches the printed card.
const inter = localFont({
  src: [
    { path: "../../assets/fonts/inter/Inter-Regular.ttf", weight: "400" },
    { path: "../../assets/fonts/inter/Inter-Bold.ttf", weight: "700" },
  ],
  display: "swap",
});

const montserrat = localFont({
  src: [
    { path: "../../assets/fonts/montserrat/Montserrat-Regular.ttf", weight: "400" },
    { path: "../../assets/fonts/montserrat/Montserrat-Bold.ttf", weight: "700" },
  ],
  display: "swap",
});

const playfair = localFont({
  src: [
    { path: "../../assets/fonts/playfair/PlayfairDisplay-Regular.ttf", weight: "400" },
    { path: "../../assets/fonts/playfair/PlayfairDisplay-Bold.ttf", weight: "700" },
  ],
  display: "swap",
});

const cormorant = localFont({
  src: [
    { path: "../../assets/fonts/cormorant/CormorantGaramond-Regular.ttf", weight: "400" },
    { path: "../../assets/fonts/cormorant/CormorantGaramond-Bold.ttf", weight: "700" },
  ],
  display: "swap",
});

const greatVibes = localFont({
  src: "../../assets/fonts/great-vibes/GreatVibes-Regular.ttf",
  weight: "400",
  display: "swap",
});

/** Interface font of the app (docs/design): variable, used at 600–900. */
export const nunito = localFont({
  src: "../../assets/fonts/nunito/Nunito-Variable.ttf",
  weight: "200 1000",
  variable: "--font-nunito",
  display: "swap",
});

/** Class names that apply each theme font. */
export const FONT_CLASS_NAMES: Record<FontKey, string> = {
  inter: inter.className,
  montserrat: montserrat.className,
  playfair: playfair.className,
  cormorant: cormorant.className,
  "great-vibes": greatVibes.className,
};
