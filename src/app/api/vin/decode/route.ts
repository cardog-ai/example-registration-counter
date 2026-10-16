import { NextResponse } from "next/server";
import { getViewer } from "@/lib/session";
import { readVin } from "@/lib/counter-read";
import { checkVin, normalizeVin } from "@/lib/vin";

/**
 * POST { vin, force? } → the decode as registration fields, plus the
 * model year's recall count. A VIN that fails its check digit is refused
 * unless `force` is set: the clerk chose to record it as typed, and the
 * check will be flagged.
 */
export async function POST(req: Request) {
  const me = await getViewer();
  if (!me) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { vin?: string; force?: boolean };
  const vin = normalizeVin(body.vin ?? "");
  const check = checkVin(vin);
  if (check.state === "empty" || check.state === "typing" || check.state === "invalid") {
    return NextResponse.json({ ok: false, error: "A VIN has 17 letters and numbers, without I, O or Q." }, { status: 400 });
  }
  if (check.state === "check-mismatch" && !body.force) {
    return NextResponse.json({ ok: false, error: check.message, checkDigit: "mismatch" }, { status: 422 });
  }
  return NextResponse.json(await readVin(me.id, vin));
}
