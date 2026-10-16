import { NextResponse } from "next/server";
import { getViewer } from "@/lib/session";
import { readVinFromImage } from "@/lib/cardog";
import { normalizeVin } from "@/lib/vin";

const MAX_BYTES = 8 * 1024 * 1024;

/** POST multipart { photo } → the VIN read from it. Counter staff only. */
export async function POST(req: Request) {
  const me = await getViewer();
  if (!me) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "No photo received." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "That photo is over 8 MB." }, { status: 413 });

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const r = await readVinFromImage(base64, "Counter · photo");
  const vin = r.data?.success ? normalizeVin(r.data.result) : null;
  const ok = Boolean(vin && vin.length === 17);
  return NextResponse.json({
    ok,
    vin,
    error: ok ? null : (r.error ?? "No VIN found in that photo. Take it closer and straight on, or type the VIN."),
    calls: [r.call],
  });
}
