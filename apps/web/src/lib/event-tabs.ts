export const EVENT_TABS = [
  { key: "visao", label: "Visão geral" },
  { key: "personalizacao", label: "Personalização" },
  { key: "qr", label: "QR e arte" },
] as const;

export type EventTab = (typeof EVENT_TABS)[number]["key"];

/** The tab named by `?aba=`; anything else (or nothing) opens the overview. */
export function parseEventTab(value: string | string[] | undefined): EventTab {
  return EVENT_TABS.find((tab) => tab.key === value)?.key ?? "visao";
}
