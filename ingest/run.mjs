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
const FX_PATH = resolve(REPO_ROOT, "data", "fx.json");

const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const BOA_URL = "https://www.bankofalbania.org/Markets/Official_exchange_rate/";

function toNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBoaEuro(html) {
  const text = htmlToText(html);
  const re = /\bEuro\s+EUR\s+([0-9]+(?:[.,][0-9]+)?)/i;
  const m = text.match(re);
  if (!m) return { perEUR: null };

  const num = m[1].replace(",", ".");
  const perEUR = Number(num);

  return { perEUR: Number.isFinite(perEUR) ? perEUR : null };
}

function parseBoaUpdatedAt(html) {
  const text = htmlToText(html);
  const re = /\bLast update:\s*([0-9]{2}\.[0-9]{2}\.[0-9]{4})\s*([0-9]{2}:[0-9]{2}:[0-9]{2})/i;
  const m = text.match(re);
  if (!m) return null;
  return `${m[1]} ${m[2]}`;
}

async function dumpBoa(html) {
  const p = resolve(REPO_ROOT, "ingest", "boa-debug.html");
  await writeFile(p, html, "utf8");
  console.warn(`🧪 BoA HTML dumped to ${p}`);
}

async function fetchLekPerEur() {
  const res = await fetch(BOA_URL, {
    headers: {
      "User-Agent": "trip-budget-converter/1.0 (+https://github.com/)",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });
  if (!res.ok) throw new Error(`BoA fetch failed: ${res.status}`);

  const html = await res.text();

  const { perEUR } = parseBoaEuro(html);
  const updatedAt = parseBoaUpdatedAt(html);

  if (!perEUR || !Number.isFinite(perEUR)) {
    await dumpBoa(html);
    throw new Error("BoA parse failed: EUR not found");
  }

  return {
    perEUR,
    updatedAt,
    fetchedAt: new Date().toISOString(),
    source: { name: "Bank of Albania – Official exchange rate", url: BOA_URL }
  };
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
  const items = Array.isArray(history.items) ? history.items : [];
  const idx = items.findIndex((x) => x.date === latest.date);

  const entry = {
    date: latest.date,
    rates: latest.rates,
    lekPerEUR: latest.lek?.perEUR ?? null
  };

  if (idx >= 0) items[idx] = entry;
  else items.push(entry);

  items.sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return {
    base: latest.base,
    source: latest.source,
    items
  };
}

function buildFx(latest) {
  const rates = { EUR: 1, ...latest.rates };

  if (latest.lek?.perEUR) {
    rates.ALL = latest.lek.perEUR;
  }

  return {
    base: "EUR",
    date: latest.date,
    fetchedAt: new Date().toISOString(),
    rates,
    meta: {
      ecb: { url: latest.source.url, date: latest.date },
      boa: latest.lek
        ? { url: latest.lek.source.url, updatedAt: latest.lek.updatedAt }
        : null
    }
  };
}

async function main() {
  const latest = await fetchEcb();

  let lek = null;
  try {
    lek = await fetchLekPerEur();
  } catch (e) {
    console.warn("⚠️ BoA lek fetch failed (continuing without lek):", String(e));
  }

  if (lek) {
    latest.lek = lek;
  }

  const history = await readJsonIfExists(HISTORY_PATH, { base: "EUR", source: latest.source, items: [] });
  const nextHistory = upsertHistory(history, latest);

  const fx = buildFx(latest);

  await writeJson(LATEST_PATH, latest);
  await writeJson(HISTORY_PATH, nextHistory);
  await writeJson(FX_PATH, fx);

  console.log(`✅ Updated ${LATEST_PATH} + ${HISTORY_PATH} + ${FX_PATH} (date=${latest.date})`);
}

main().catch((e) => {
  console.error("❌ Ingest failed:", e);
  process.exit(1);
});