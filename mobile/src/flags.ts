import type { Lang } from "./i18n";

/** Currency code → emoji flag. Derived from the ISO country prefix, with special cases. */
const SPECIAL_FLAGS: Record<string, string> = {
  EUR: "🇪🇺",
  XAF: "🌍",
  XOF: "🌍",
  XCD: "🌎"
};

export function flagFor(code: string): string {
  const special = SPECIAL_FLAGS[code];
  if (special) return special;

  const cc = code.slice(0, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "🏳️";

  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.charCodeAt(0) - 65, A + cc.charCodeAt(1) - 65);
}

export type Region = "balkans" | "europe" | "americas" | "asiaPacific" | "middleEastAfrica" | "other";

const REGIONS: Record<Region, string[]> = {
  balkans: ["ALL", "EUR", "TRY", "RON", "BGN", "RSD", "MKD", "BAM"],
  europe: ["GBP", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "ISK"],
  americas: ["USD", "CAD", "MXN", "BRL"],
  asiaPacific: ["JPY", "CNY", "HKD", "INR", "KRW", "SGD", "THB", "IDR", "PHP", "MYR", "AUD", "NZD"],
  middleEastAfrica: ["ILS", "ZAR"],
  other: []
};

export function regionFor(code: string): Region {
  for (const [region, codes] of Object.entries(REGIONS) as [Region, string[]][]) {
    if (codes.includes(code)) return region;
  }
  return "other";
}

export const REGION_ORDER: Region[] = ["balkans", "europe", "americas", "asiaPacific", "middleEastAfrica", "other"];

export function regionLabel(region: Region, lang: Lang): string {
  const labels: Record<Region, { en: string; sq: string }> = {
    balkans: { en: "Balkans & nearby", sq: "Ballkani dhe rreth" },
    europe: { en: "Europe", sq: "Europa" },
    americas: { en: "Americas", sq: "Amerikat" },
    asiaPacific: { en: "Asia & Pacific", sq: "Azia dhe Paqësori" },
    middleEastAfrica: { en: "Middle East & Africa", sq: "Lindja e Mesme dhe Afrika" },
    other: { en: "Other", sq: "Të tjera" }
  };
  return labels[region][lang];
}
