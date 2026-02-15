import { XMLParser } from "fast-xml-parser";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// repo root is one level up from /ingest
const REPO_ROOT = resolve(__dirname, "..");

const LATEST_PATH = resolve(REPO_ROOT, "data", "latest.json");
const HISTORY_PATH = resolve(REPO_ROOT, "data", "history.json");

const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

async function fetchEcb() {
  const res = await fetch(ECB_URL);
  if (!res.ok) throw new Error(`ECB fetch failed: ${res.status}`);
  const xml = await res.text();

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const doc = parser.parse(xml);

  const envelope = doc["gesmes:Envelope"];
  const cubeRoot = envelope?.Cube?.Cube;
  const date = cubeRoot?.time;

  const cubes = Array.isArray(cubeRoot?.Cube) ? cubeRoot.Cube : [];

  const rates = {};
  for (const c of cubes) {
    const currency = c.currency;
    const rate = toNumber(c.rate);
    if (currency && rate) rates[currency] = rate;
  }

  return {
    base: "EUR",
    date,
    fetchedAt: new Date().toISOString(),
    source: {
      name: "ECB eurofxref-daily.xml",
      url: ECB_URL
    },
    rates
  };
}

async function readJsonIfExists(path, fallback) {
  if (!existsSync(path)) return fallback;
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw);
}

async function writeJson(path, obj) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(obj, null, 2), "utf8");
}

function upsertHistory(history, latest) {
  // history format: { base, source, items: [{date, rates}] }
  const items = Array.isArray(history.items) ? history.items : [];
  const idx = items.findIndex((x) => x.date === latest.date);

  const entry = {
    date: latest.date,
    rates: latest.rates
  };

  if (idx >= 0) items[idx] = entry;
  else items.push(entry);

  // sort by date ascending
  items.sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return {
    base: latest.base,
    source: latest.source,
    items
  };
}

async function main() {
  const latest = await fetchEcb();

  // NOTE: ALL handling comes later (Bank of Albania step)
  // For now we keep the ECB major currencies clean and stable.

  const history = await readJsonIfExists(HISTORY_PATH, { base: "EUR", source: latest.source, items: [] });
  const nextHistory = upsertHistory(history, latest);

  await writeJson(LATEST_PATH, latest);
  await writeJson(HISTORY_PATH, nextHistory);

  console.log(`✅ Updated ${LATEST_PATH} + ${HISTORY_PATH} (date=${latest.date})`);
}

main().catch((e) => {
  console.error("❌ Ingest failed:", e);
  process.exit(1);
});