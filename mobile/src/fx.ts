import * as FileSystem from "expo-file-system/legacy";
import { CACHE_FILE, FX_URL } from "./config";

export type FxJson = {
  base: "EUR";
  date: string;
  fetchedAt: string;
  rates: Record<string, number>;
  lek?: {
    perEUR: number;
    updatedAt: string;
    fetchedAt: string;
    source: { name: string; url: string };
  };
};

const cachePath = () =>
  `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? ""}${CACHE_FILE}`;

export async function loadFx(): Promise<{ fx: FxJson; fromCache: boolean }> {
  const path = cachePath();

  // Try cache first
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      const raw = await FileSystem.readAsStringAsync(path);
      const fx = JSON.parse(raw) as FxJson;

      // refresh in background
      refreshFx(path).catch(() => {});
      return { fx, fromCache: true };
    }
  } catch {
    // ignore
  }

  // no cache -> fetch now
  const fx = await fetchFx();
  await FileSystem.writeAsStringAsync(path, JSON.stringify(fx));
  return { fx, fromCache: false };
}

export async function refreshFxNow(): Promise<{ fx: FxJson }> {
  const fx = await fetchFx();
  const path = cachePath();
  await FileSystem.writeAsStringAsync(path, JSON.stringify(fx));
  return { fx };
}

async function refreshFx(path: string) {
  const fx = await fetchFx();
  await FileSystem.writeAsStringAsync(path, JSON.stringify(fx));
}

async function fetchFx(): Promise<FxJson> {
  const res = await fetch(FX_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);
  return (await res.json()) as FxJson;
}

export function convert(amount: number, from: string, to: string, rates: Record<string, number>) {
  const rFrom = rates[from];
  const rTo = rates[to];
  if (!rFrom || !rTo) return null;
  return amount * (rTo / rFrom);
}

export function listCurrencies(rates: Record<string, number>) {
  return Object.keys(rates).sort();
}