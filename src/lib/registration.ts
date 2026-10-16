/**
 * From a Cardog decode to the Department's registration form, and the
 * rules that decide whether a check is clear, flagged, or held.
 *
 * Pure: no I/O, used by the browser (as the clerk works) and the server
 * (when the check is recorded, so the browser cannot skip a rule).
 *
 * The form takes codes from the Department's own lists, not the decoder's
 * words. Each coded field maps the decode's entity ref (`refs.bodyStyle`,
 * `refs.fuelType`, `refs.gvwr`, `refs.vehicleType`) onto a code. A null ref,
 * or a ref with no code on the form, is never guessed: the field is left
 * empty and marked for the clerk to enter by hand.
 */

// ── The Department's code lists ───────────────────────────────────────────

export interface Code {
  code: string;
  label: string;
}

export const BODY_CODES: Code[] = [
  { code: "SD", label: "Sedan" },
  { code: "HB", label: "Hatchback" },
  { code: "CP", label: "Coupe" },
  { code: "CV", label: "Convertible" },
  { code: "SW", label: "Station wagon" },
  { code: "UT", label: "Utility (SUV, crossover)" },
  { code: "MV", label: "Minivan" },
  { code: "VN", label: "Passenger van" },
  { code: "CG", label: "Cargo van" },
  { code: "PU", label: "Pickup" },
  { code: "CC", label: "Chassis cab" },
  { code: "TT", label: "Truck-tractor" },
  { code: "MC", label: "Motorcycle" },
  { code: "MT", label: "Three-wheeled motorcycle" },
  { code: "OR", label: "Off-road vehicle" },
  { code: "TL", label: "Trailer" },
  { code: "OT", label: "Other" },
];

export const FUEL_CODES: Code[] = [
  { code: "G", label: "Gasoline" },
  { code: "D", label: "Diesel" },
  { code: "E", label: "Electric" },
  { code: "H", label: "Hybrid" },
  { code: "X", label: "Plug-in hybrid" },
  { code: "F", label: "Flexible fuel" },
  { code: "N", label: "Natural gas" },
  { code: "P", label: "Propane" },
  { code: "Y", label: "Hydrogen" },
  { code: "0", label: "None (trailer)" },
];

/** Gross vehicle weight rating classes, as the form prints them. */
export const WEIGHT_CODES: Code[] = [
  { code: "1", label: "Class 1 · up to 6,000 lb (2,722 kg)" },
  { code: "2", label: "Class 2 · 6,001 to 10,000 lb (2,722 to 4,536 kg)" },
  { code: "3", label: "Class 3 · 10,001 to 14,000 lb (4,536 to 6,350 kg)" },
  { code: "4", label: "Class 4 · 14,001 to 16,000 lb (6,350 to 7,257 kg)" },
  { code: "5", label: "Class 5 · 16,001 to 19,500 lb (7,257 to 8,845 kg)" },
  { code: "6", label: "Class 6 · 19,501 to 26,000 lb (8,845 to 11,794 kg)" },
  { code: "7", label: "Class 7 · 26,001 to 33,000 lb (11,794 to 14,969 kg)" },
  { code: "8", label: "Class 8 · over 33,000 lb (14,969 kg)" },
  { code: "NA", label: "Not rated (motorcycle)" },
];

export const TYPE_CODES: Code[] = [
  { code: "PC", label: "Passenger car" },
  { code: "MP", label: "Multipurpose passenger vehicle" },
  { code: "TK", label: "Truck" },
  { code: "BU", label: "Bus" },
  { code: "MC", label: "Motorcycle" },
  { code: "TL", label: "Trailer" },
  { code: "LS", label: "Low-speed vehicle" },
  { code: "OR", label: "Off-road vehicle" },
];

// ── The form ──────────────────────────────────────────────────────────────

export type FieldKey = "year" | "make" | "model" | "body" | "fuel" | "weightClass" | "vehicleType";

export const FIELDS: { key: FieldKey; label: string; codes?: Code[] }[] = [
  { key: "year", label: "Model year" },
  { key: "make", label: "Make" },
  { key: "model", label: "Model" },
  { key: "body", label: "Body type", codes: BODY_CODES },
  { key: "fuel", label: "Fuel", codes: FUEL_CODES },
  { key: "weightClass", label: "Weight class (GVWR)", codes: WEIGHT_CODES },
  { key: "vehicleType", label: "Vehicle type", codes: TYPE_CODES },
];

/**
 * One form field.
 *   vin      filled from the decode, unchanged
 *   manual   the decode does not say; the clerk entered it
 *   changed  the decode said one thing; the clerk recorded another
 */
export interface RegField {
  key: FieldKey;
  value: string | null;
  decoded: string | null;
  source: "vin" | "manual" | "changed";
  /** Why a field is left for the clerk, in the clerk's words. */
  gap: string | null;
}
export type RegFields = Record<FieldKey, RegField>;

/** The part of a decode the form reads. Matches `VinIdentity` from the SDK. */
export interface DecodeLike {
  year: number | null;
  make: string | null;
  model: string | null;
  refs: {
    modelYear: string | null;
    bodyStyle: string | null;
    fuelType: string | null;
    electrificationLevel: string | null;
    vehicleType: string | null;
    gvwr?: string | null;
    fuelTypeSecondary?: string | null;
  };
}

/** Decode → the form, every field either filled or marked with its gap. */
export function fieldsFromDecode(d: DecodeLike): RegFields {
  const r = d.refs;
  const coded = (key: FieldKey, ref: string | null | undefined, code: string | null, noun: string): RegField => {
    if (code) return { key, value: code, decoded: code, source: "vin", gap: null };
    const gap = ref
      ? `The decode says “${words(ref)}”, which has no ${noun} code on this form. Choose one.`
      : `The VIN does not say the ${noun}. Enter it from the document or the vehicle.`;
    return { key, value: null, decoded: null, source: "manual", gap };
  };
  const text = (key: FieldKey, v: string | number | null, noun: string): RegField =>
    v !== null && v !== ""
      ? { key, value: String(v), decoded: String(v), source: "vin", gap: null }
      : { key, value: null, decoded: null, source: "manual", gap: `The VIN does not say the ${noun}. Enter it from the document.` };

  return {
    year: text("year", d.year, "model year"),
    make: text("make", d.make, "make"),
    model: text("model", d.model, "model"),
    body: coded("body", r.bodyStyle, bodyCode(r.bodyStyle), "body type"),
    fuel: coded("fuel", r.fuelType ?? r.electrificationLevel, fuelCode(r.fuelType, r.electrificationLevel), "fuel"),
    weightClass: coded("weightClass", r.gvwr, weightCode(r.gvwr), "weight class"),
    vehicleType: coded("vehicleType", r.vehicleType, typeCode(r.vehicleType), "vehicle type"),
  };
}

/** Apply what the clerk entered. A field's source follows from its value. */
export function withEntries(base: RegFields, entries: Partial<Record<FieldKey, string>>): RegFields {
  const out = { ...base };
  for (const f of FIELDS) {
    const b = base[f.key];
    const raw = entries[f.key];
    const value = raw === undefined ? b.value : raw.trim() || null;
    const source: RegField["source"] = b.decoded === null ? "manual" : value === b.decoded ? "vin" : "changed";
    out[f.key] = { ...b, value, source };
  }
  return out;
}

export function labelFor(key: FieldKey, value: string | null): string | null {
  if (value === null) return null;
  const codes = FIELDS.find((f) => f.key === key)?.codes;
  if (!codes) return value;
  const c = codes.find((c) => c.code === value);
  return c ? `${c.code} · ${c.label}` : value;
}

// ── The rules ─────────────────────────────────────────────────────────────

/** What the ownership document (or previous registration) says. */
export interface Stated {
  make: string;
  year: string;
}
export interface Mismatch {
  field: "make" | "year";
  document: string;
  vin: string;
}
export interface Flag {
  field: FieldKey | "vin";
  reason: string;
}
export type Status = "clear" | "flagged" | "held";

/** Makes compare without case, spaces or punctuation: "Harley Davidson" is "Harley-Davidson". */
const squashMake = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Document vs VIN, on the two facts a document always carries. */
export function compareDocument(fields: RegFields, stated: Stated): Mismatch[] {
  const out: Mismatch[] = [];
  const vinMake = fields.make.decoded;
  const vinYear = fields.year.decoded;
  if (vinMake && stated.make.trim() && squashMake(vinMake) !== squashMake(stated.make)) {
    out.push({ field: "make", document: stated.make.trim(), vin: vinMake });
  }
  if (vinYear && stated.year.trim() && stated.year.trim() !== vinYear) {
    out.push({ field: "year", document: stated.year.trim(), vin: vinYear });
  }
  return out;
}

export function flagsFor(fields: RegFields, checkDigit: "ok" | "mismatch"): Flag[] {
  const out: Flag[] = [];
  if (checkDigit === "mismatch") out.push({ field: "vin", reason: "The VIN fails its check digit and was recorded as typed." });
  for (const f of FIELDS) {
    const x = fields[f.key];
    if (x.source === "manual") out.push({ field: f.key, reason: `${f.label} entered by hand: the decode did not supply it.` });
    if (x.source === "changed")
      out.push({
        field: f.key,
        reason: `${f.label} changed by hand from ${labelFor(f.key, x.decoded)} to ${labelFor(f.key, x.value) ?? "blank"}.`,
      });
  }
  return out;
}

export function statusFor(mismatches: Mismatch[], flags: Flag[]): Status {
  if (mismatches.length) return "held";
  if (flags.length) return "flagged";
  return "clear";
}

/** Every field has a value, and the document's make and year are entered. */
export function missing(fields: RegFields, stated: Stated): string[] {
  const out = FIELDS.filter((f) => !fields[f.key].value).map((f) => f.label);
  if (!stated.make.trim()) out.push("Make on the document");
  if (!/^\d{4}$/.test(stated.year.trim())) out.push("Year on the document");
  return out;
}

// ── Ref → code ────────────────────────────────────────────────────────────

const key = (ref: string | null | undefined) => (ref ? ref.slice(ref.indexOf(":") + 1) : "");
/** "body-style:truck-tractor" → "truck tractor": how a ref reads to a clerk. */
const words = (ref: string) => key(ref).replace(/-/g, " ");

export function bodyCode(ref: string | null | undefined): string | null {
  const k = key(ref);
  if (!k) return null;
  if (k.includes("three-wheeled") || k.includes("autocycle")) return "MT";
  if (k.startsWith("motorcycle")) return "MC";
  if (k.startsWith("off-road")) return "OR";
  if (k.includes("truck-tractor")) return "TT";
  if (k.includes("chassis-cab")) return "CC";
  if (k.includes("pickup")) return "PU";
  if (k.includes("cargo-van")) return "CG";
  if (k.includes("minivan")) return "MV";
  if (k.includes("van")) return "VN";
  if (k.includes("sedan")) return "SD";
  if (k.includes("hatchback")) return "HB";
  if (k.includes("convertible")) return "CV";
  if (k.includes("coupe")) return "CP";
  if (k.includes("wagon")) return "SW";
  if (k.includes("sport-utility") || k.includes("crossover")) return "UT";
  if (k.includes("trailer")) return "TL";
  return null;
}

export function fuelCode(fuel: string | null | undefined, electrification: string | null | undefined): string | null {
  const e = key(electrification);
  if (e.startsWith("phev")) return "X";
  if (e.startsWith("bev")) return "E";
  if (e.startsWith("fcev")) return "Y";
  if (e.includes("hev")) return "H";
  const f = key(fuel);
  if (!f) return null;
  if (f === "gasoline") return "G";
  if (f === "diesel") return "D";
  if (f === "electric") return "E";
  if (f.includes("flex") || f.includes("ethanol") || f.includes("e85")) return "F";
  if (f.includes("natural-gas") || f.includes("cng") || f.includes("lng")) return "N";
  if (f.includes("propane") || f.includes("petroleum-gas") || f.includes("lpg")) return "P";
  if (f.includes("hydrogen") || f.includes("fuel-cell")) return "Y";
  return null;
}

/** "gvwr:class-3-10-001-14-000-lb-…" → "3". Classes 2E–2H are class 2. */
export function weightCode(ref: string | null | undefined): string | null {
  const m = key(ref).match(/^class-([1-8])/);
  return m ? m[1] : null;
}

export function typeCode(ref: string | null | undefined): string | null {
  const k = key(ref);
  if (!k) return null;
  if (k.startsWith("passenger-car")) return "PC";
  if (k.startsWith("multipurpose")) return "MP";
  if (k.startsWith("truck")) return "TK";
  if (k.startsWith("bus")) return "BU";
  if (k.startsWith("motorcycle")) return "MC";
  if (k.startsWith("trailer")) return "TL";
  if (k.startsWith("low-speed")) return "LS";
  if (k.startsWith("off-road")) return "OR";
  return null;
}
