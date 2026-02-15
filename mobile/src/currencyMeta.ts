export type CurrencyMeta = { symbol: string; position: "prefix" | "suffix" };

export const CURRENCY_META: Record<string, CurrencyMeta> = {
  EUR: { symbol: "€", position: "prefix" },
  USD: { symbol: "$", position: "prefix" },
  GBP: { symbol: "£", position: "prefix" },
  ALL: { symbol: "Lek", position: "suffix" },
  CHF: { symbol: "CHF", position: "suffix" },
  JPY: { symbol: "¥", position: "prefix" },
  CAD: { symbol: "CA$", position: "prefix" },
  AUD: { symbol: "A$", position: "prefix" }
};