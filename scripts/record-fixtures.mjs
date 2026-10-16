#!/usr/bin/env node
/**
 * Records the fixtures the app serves when CARDOG_API_KEY is not set.
 *
 *   CARDOG_API_KEY=... node scripts/record-fixtures.mjs [VIN ...]
 *
 * It makes exactly the SDK calls the counter makes, for each VIN, and writes
 * the full responses plus their latency to src/fixtures/<VIN>.json. No key
 * is ever written to disk. Set CARDOG_BASE_URL to record against another
 * API origin. To serve a new VIN in fixture mode, add it to
 * src/lib/fixtures.ts as well.
 */
import { CardogClient } from "@cardog/api";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_VINS = [
  "3C63R3NL9NG189460", // 2022 Ram 3500: every field from the VIN
  "1FUJHTDVXLLMD3594", // 2020 Freightliner Cascadia: truck-tractor, class 8
  "5YFB4MBE3NP125200", // 2022 Toyota Corolla: no weight class in the decode
  "1HD1FF41X9Y666062", // 2009 Harley-Davidson Electra Glide Classic: motorcycle
  "5YFB4MBE7NP125200", // the Corolla with a wrong 9th character
];

const apiKey = process.env.CARDOG_API_KEY;
if (!apiKey) {
  console.error("Set CARDOG_API_KEY to record fixtures.");
  process.exit(1);
}
const baseUrl = process.env.CARDOG_BASE_URL || undefined;
const client = new CardogClient({ apiKey, baseUrl, appId: "dvs-registration-counter-recorder" });

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "fixtures");
await mkdir(out, { recursive: true });

async function timed(fn) {
  const t0 = performance.now();
  try {
    const response = await fn();
    return { ok: true, ms: Math.round(performance.now() - t0), provenance: "recorded", response };
  } catch (e) {
    return {
      ok: false,
      ms: Math.round(performance.now() - t0),
      provenance: "recorded",
      error: { status: e?.status ?? null, message: e?.message ?? String(e), body: e?.body ?? e?.envelope ?? null },
    };
  }
}

const vins = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_VINS;
for (const vin of vins) {
  const decode = await timed(() => client.v2.vin.getByVin(vin));
  const modelYear = decode.ok ? decode.response.refs?.modelYear : null;
  const recalls = modelYear ? await timed(() => client.v2.recalls.entity(modelYear, { limit: 5 })) : null;
  const file = { vin, recordedAt: new Date().toISOString(), sdk: "@cardog/api", calls: { decode, recalls } };
  await writeFile(join(out, `${vin}.json`), JSON.stringify(file, null, 2) + "\n");
  const status = Object.entries(file.calls)
    .map(([k, v]) => `${k}:${v ? (v.ok ? "ok" : (v.error.status ?? "err")) : "-"}`)
    .join(" ");
  console.log(vin, status);
}
