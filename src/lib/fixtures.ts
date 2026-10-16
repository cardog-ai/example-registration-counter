import "server-only";
import corolla from "@/fixtures/5YFB4MBE3NP125200.json";
import corollaTypo from "@/fixtures/5YFB4MBE7NP125200.json";
import ram from "@/fixtures/3C63R3NL9NG189460.json";
import cascadia from "@/fixtures/1FUJHTDVXLLMD3594.json";
import glide from "@/fixtures/1HD1FF41X9Y666062.json";

/** The VINs fixture mode knows, and what each one shows at the counter. */
export const FIXTURE_VINS = [
  { vin: "3C63R3NL9NG189460", label: "2022 Ram 3500 pickup", shows: "Every field from the VIN, weight class 3" },
  { vin: "1FUJHTDVXLLMD3594", label: "2020 Freightliner Cascadia", shows: "Truck-tractor, weight class 8" },
  { vin: "5YFB4MBE3NP125200", label: "2022 Toyota Corolla", shows: "No weight class in the decode" },
  { vin: "1HD1FF41X9Y666062", label: "2009 Harley-Davidson Electra Glide", shows: "Motorcycle, no weight class" },
  { vin: "5YFB4MBE7NP125200", label: "The Corolla, one character off", shows: "Fails its check digit" },
] as const;

type Stored = {
  ok: boolean;
  ms: number;
  provenance?: string;
  response?: unknown;
  error?: { status: number | null; message: string };
};
type FixtureFile = { vin: string; calls: Record<string, Stored | null> };

const files = new Map<string, FixtureFile>(
  ([corolla, corollaTypo, ram, cascadia, glide] as unknown as FixtureFile[]).map((f) => [f.vin, f])
);

export type FixtureCall =
  | { ok: true; ms: number; provenance: string; response: unknown }
  | { ok: false; ms: number; provenance: string; status: number | null; message: string };

export function fixtureCall(vin: string, key: string): FixtureCall {
  if (key === "image") {
    return {
      ok: true,
      ms: 1420,
      provenance: "fixture mode: no image sent, the Ram's VIN is returned",
      response: { success: true, result: vin },
    };
  }
  const file = files.get(vin.toUpperCase());
  if (!file) {
    return {
      ok: false,
      ms: 0,
      provenance: "fixture mode",
      status: 404,
      message: `Fixture mode holds ${FIXTURE_VINS.length} VINs. Set CARDOG_API_KEY to decode any VIN.`,
    };
  }
  const c = file.calls[key];
  if (!c) return { ok: false, ms: 0, provenance: "not recorded", status: null, message: "Not recorded for this VIN." };
  if (c.ok) return { ok: true, ms: c.ms, provenance: c.provenance ?? "recorded", response: c.response };
  return {
    ok: false,
    ms: c.ms,
    provenance: c.provenance ?? "recorded",
    status: c.error?.status ?? null,
    message: c.error?.message ?? "Failed",
  };
}
