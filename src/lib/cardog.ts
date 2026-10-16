/**
 * Every Cardog call this app makes lives in this file. There are three.
 *
 * The client is built once, on the server, from CARDOG_API_KEY. The key
 * never reaches the browser: route handlers and server actions call the
 * functions below, and the browser only ever sees the trimmed call records.
 *
 * With no key set, the app runs in fixture mode: each function serves a
 * response recorded for one of five sample VINs (src/fixtures), with its
 * latency. `pnpm record-fixtures` re-records them from the live API.
 */
import "server-only";
import { CardogClient, APIErrorV2, APIError } from "@cardog/api";
import { trimForDisplay, type CallRecord } from "./calls";
import { fixtureCall, FIXTURE_VINS } from "./fixtures";

const apiKey = process.env.CARDOG_API_KEY?.trim();

/** The one Cardog client. Server-side only. */
export const cardog: CardogClient | null = apiKey
  ? new CardogClient({ apiKey, appId: "dvs-registration-counter", baseUrl: process.env.CARDOG_BASE_URL || undefined })
  : null;

export const dataMode: "live" | "fixture" = cardog ? "live" : "fixture";
export { FIXTURE_VINS };

// The response types, read off the client's own method signatures.
type V2 = CardogClient["v2"];
export type VinIdentity = Awaited<ReturnType<V2["vin"]["getByVin"]>>;
export type ModelYearRecalls = Awaited<ReturnType<V2["recalls"]["entity"]>>;
export type VinImageRead = Awaited<ReturnType<CardogClient["vin"]["image"]>>;

export interface Result<T> {
  data: T | null;
  call: CallRecord;
  error: string | null;
}

// ── The calls ─────────────────────────────────────────────────────────────

/**
 * VIN → identity card. The counter's main call.
 * `cardog.v2.vin.getByVin(vin)` · GET /v2/vin/{vin}
 * Returns year, make and model as display names, and the entity refs the
 * form is filled from: bodyStyle, fuelType, electrificationLevel,
 * vehicleType and gvwr (the build's weight class). A null ref means the
 * decode does not say; the counter leaves that field for the clerk.
 *
 * It decodes at the build grain (positions 1 to 8 and 10), so a VIN with a
 * wrong 9th character can still come back `valid`. The counter runs the
 * check digit itself, before the call (lib/vin.ts).
 */
export function decodeVin(vin: string, step: string) {
  return run<VinIdentity>({
    step,
    vin,
    key: "decode",
    method: "cardog.v2.vin.getByVin",
    args: [vin],
    http: `GET /v2/vin/${vin}`,
    returns: "Identity card: year, make, model, and the refs for body, fuel, vehicle type and weight class",
    live: (c) => c.v2.vin.getByVin(vin),
  });
}

/**
 * Model year → recall campaigns issued for it.
 * `cardog.v2.recalls.entity(modelYearRef, { limit })` · GET /v2/recalls/entity/{modelYearRef}
 * Returns `total` and the newest campaigns that list the model year
 * (Transport Canada, NHTSA and other authorities). They match the model
 * year, not this VIN: the counter shows one informational line and never
 * says whether a recall applies to the vehicle in front of it.
 */
export function readModelYearRecalls(modelYearRef: string, vin: string, step: string) {
  return run<ModelYearRecalls>({
    step,
    vin,
    key: "recalls",
    method: "cardog.v2.recalls.entity",
    args: [modelYearRef, { limit: 5 }],
    http: `GET /v2/recalls/entity/${modelYearRef}?limit=5`,
    returns: "How many recall campaigns were issued for the model year, and the newest five",
    live: (c) => c.v2.recalls.entity(modelYearRef, { limit: 5 }),
  });
}

/**
 * Photo → VIN, for a sticker the scanner cannot read.
 * `cardog.vin.image(base64)` · POST /vin/image
 * Reads a VIN from a photo of the door-jamb label, the windshield plate or
 * an ownership document. Returns `{ success, result }`, where `result` is
 * the VIN. In fixture mode no image is sent and the Ram's VIN comes back.
 */
export async function readVinFromImage(base64: string, step: string): Promise<Result<VinImageRead>> {
  return run<VinImageRead>({
    step,
    vin: FIXTURE_VINS[0].vin,
    key: "image",
    method: "cardog.vin.image",
    args: [`<${Math.round((base64.length * 3) / 4 / 1024)} KB image, base64>`],
    http: "POST /vin/image",
    returns: "The VIN read from the photo",
    live: (c) => c.vin.image(base64),
  });
}

// ── Plumbing: time the call, or serve the fixture, and log it ────────────

interface Spec<T> {
  step: string;
  vin: string;
  key: "decode" | "recalls" | "image";
  method: string;
  args: unknown[];
  http: string;
  returns: string;
  live: (c: CardogClient) => Promise<T>;
}

async function run<T>(s: Spec<T>): Promise<Result<T>> {
  const base = {
    id: crypto.randomUUID(),
    step: s.step,
    method: s.method,
    args: s.args,
    http: s.http,
    returns: s.returns,
    at: new Date().toISOString(),
  };

  if (!cardog) {
    const f = fixtureCall(s.vin, s.key);
    const call: CallRecord = {
      ...base,
      mode: "fixture",
      ok: f.ok,
      status: f.ok ? 200 : f.status,
      ms: f.ms,
      provenance: f.provenance,
      response: trimForDisplay(f.ok ? f.response : { error: f.message }),
    };
    return { data: f.ok ? (f.response as T) : null, call, error: f.ok ? null : f.message };
  }

  const t0 = performance.now();
  try {
    const data = await s.live(cardog);
    const call: CallRecord = {
      ...base,
      mode: "live",
      ok: true,
      status: 200,
      ms: ms(t0),
      response: trimForDisplay(data),
    };
    return { data, call, error: null };
  } catch (e) {
    const status = e instanceof APIErrorV2 || e instanceof APIError ? e.status : null;
    const message = e instanceof Error ? e.message : String(e);
    const body = e instanceof APIErrorV2 ? { code: e.code, message, hint: e.hint } : { message };
    const call: CallRecord = { ...base, mode: "live", ok: false, status, ms: ms(t0), response: trimForDisplay(body) };
    return { data: null, call, error: message };
  }
}

const ms = (t0: number) => Math.round(performance.now() - t0);
