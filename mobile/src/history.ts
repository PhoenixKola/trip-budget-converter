import * as FileSystem from "expo-file-system/legacy";

const HISTORY_URL =
  "https://raw.githubusercontent.com/PhoenixKola/trip-budget-converter/refs/heads/main/data/history.json";

const HISTORY_CACHE_FILE = "fx-history.json";

export type HistoryJson = {
  base: "EUR";
  items: { date: string; rates: Record<string, number> }[];
};

const historyPath = () =>
  `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? ""}${HISTORY_CACHE_FILE}`;

async function readCachedHistory(): Promise<HistoryJson | null> {
  try {
    const info = await FileSystem.getInfoAsync(historyPath());
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(historyPath());
    return JSON.parse(raw) as HistoryJson;
  } catch {
    return null;
  }
}

async function fetchHistory(): Promise<HistoryJson> {
  const res = await fetch(`${HISTORY_URL}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`History fetch failed: ${res.status}`);
  return (await res.json()) as HistoryJson;
}

/**
 * Returns cached history immediately if available and refreshes in the background;
 * otherwise fetches from the network. Returns null if neither works (offline, first run).
 */
export async function loadHistory(onUpdate?: (h: HistoryJson) => void): Promise<HistoryJson | null> {
  const cached = await readCachedHistory();

  const refresh = async () => {
    const fresh = await fetchHistory();
    await FileSystem.writeAsStringAsync(historyPath(), JSON.stringify(fresh)).catch(() => {});
    return fresh;
  };

  if (cached) {
    refresh()
      .then((fresh) => onUpdate?.(fresh))
      .catch(() => {});
    return cached;
  }

  try {
    return await refresh();
  } catch {
    return null;
  }
}

export type SeriesPoint = { date: string; rate: number };

/**
 * Rate series for 1 `from` in `to` over the last `days` items.
 * EUR is the base (rate 1). Returns null when either side has no history (e.g. ALL).
 */
export function seriesFor(history: HistoryJson, from: string, to: string, days = 30): SeriesPoint[] | null {
  if (from === to) return null;

  const rateOf = (rates: Record<string, number>, code: string) => (code === "EUR" ? 1 : rates[code]);

  const points: SeriesPoint[] = [];
  for (const item of history.items) {
    const rFrom = rateOf(item.rates, from);
    const rTo = rateOf(item.rates, to);
    if (!rFrom || !rTo) continue;
    points.push({ date: item.date, rate: rTo / rFrom });
  }

  if (points.length < 2) return null;

  points.sort((a, b) => (a.date < b.date ? -1 : 1));
  return points.slice(-days);
}

/** Percent change from first to last point of a series. */
export function seriesChangePct(series: SeriesPoint[]): number {
  const first = series[0].rate;
  const last = series[series.length - 1].rate;
  if (!first) return 0;
  return ((last - first) / first) * 100;
}
