export type Lang = "en" | "sq";

const DICT = {
  en: {
    title: "Trip Budget Converter",
    ratesDate: "Rates date",
    cached: "cached",
    cachedWorksOffline: "Cached (works offline)",
    live: "Live",
    amount: "Amount",
    from: "From",
    to: "To",
    result: "Result",
    offline: "Cached (works offline)",
    refreshed: "Updated",
    refreshFailed: "Refresh failed",
    tabConvert: "Convert",
    tabChecklist: "Checklist",
    tabSplit: "Split"
  },
  sq: {
    title: "Konvertues Buxheti Udhëtimi",
    ratesDate: "Data e kursit",
    cached: "nga cache",
    cachedWorksOffline: "Nga cache (punon offline)",
    live: "Live",
    amount: "Shuma",
    from: "Nga",
    to: "Në",
    result: "Rezultati",
    offline: "Nga cache (punon offline)",
    refreshed: "U përditësua",
    refreshFailed: "Dështoi përditësimi",
    tabConvert: "Kursi",
    tabChecklist: "Lista",
    tabSplit: "Ndarja"
  }
} as const;

export function t(lang: Lang, key: keyof typeof DICT.en) {
  return (DICT as any)[lang]?.[key] ?? (DICT as any).en[key] ?? String(key);
}