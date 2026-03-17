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

export const cachePath = () =>
  `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? ""}${CACHE_FILE}`;

export async function readCachedFx(): Promise<FxJson | null> {
  const path = cachePath();

  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;

    const raw = await FileSystem.readAsStringAsync(path);
    return JSON.parse(raw) as FxJson;
  } catch {
    return null;
  }
}

export async function writeCachedFx(fx: FxJson): Promise<void> {
  const path = cachePath();
  await FileSystem.writeAsStringAsync(path, JSON.stringify(fx));
}

export async function loadFx(): Promise<{ fx: FxJson; fromCache: boolean }> {
  const cached = await readCachedFx();

  if (cached) {
    return { fx: cached, fromCache: true };
  }

  const fx = await fetchFx();
  await writeCachedFx(fx);
  return { fx, fromCache: false };
}

export async function refreshFxNow(): Promise<{ fx: FxJson }> {
  const fx = await fetchFx();
  await writeCachedFx(fx);
  return { fx };
}

export async function refreshFx(): Promise<FxJson> {
  const fx = await fetchFx();
  await writeCachedFx(fx);
  return fx;
}

async function fetchFx(): Promise<FxJson> {
  const url = `${FX_URL}${FX_URL.includes("?") ? "&" : "?"}t=${Date.now()}`;
  const res = await fetch(url);

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