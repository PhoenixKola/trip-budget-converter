import type { Lang } from "./i18n";
import { CURRENCY_META } from "./currencyMeta";
import { convert } from "./fx";

function nfFor(lang: Lang) {
  // RN/Expo usually supports Intl. If device doesn’t, this still won’t crash—just use default.
  const locale = lang === "sq" ? "sq-AL" : "en";
  return (n: number, decimals: number) => {
    try {
      return new Intl.NumberFormat(locale, {
        maximumFractionDigits: decimals,
        minimumFractionDigits: 0
      }).format(n);
    } catch {
      // fallback
      const fixed = n.toFixed(decimals);
      return lang === "sq" ? fixed.replace(".", ",") : fixed;
    }
  };
}

export function formatMoney(amount: number, code: string, lang: Lang) {
  const abs = Math.abs(amount);
  const decimals = abs >= 1000 ? 2 : abs >= 1 ? 2 : 4;

  const fmt = nfFor(lang);
  const meta = CURRENCY_META[code] ?? { symbol: code, position: "suffix" };
  const num = fmt(amount, decimals);

  if (meta.position === "prefix") return `${meta.symbol}${num}`;
  return `${num} ${meta.symbol}`;
}

export function formatRateLine(
  baseAmount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
  lang: Lang
) {
  const out = convert(baseAmount, from, to, rates);
  if (out === null) return `${from} → ${to}: —`;
  return `${formatMoney(baseAmount, from, lang)} = ${formatMoney(out, to, lang)}`;
}