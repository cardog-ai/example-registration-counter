/**
 * One informational line: how many recall campaigns were issued for the
 * vehicle's model and year. It is about the model year, not this vehicle,
 * and it plays no part in the registration, so it is drawn quiet and says
 * so in words.
 */

import type { RecallLine as Line } from "@/lib/counter-read";

export function RecallLine({ recalls, vehicle }: { recalls: Line | null | undefined; vehicle: string | null }) {
  return (
    <div className="flex min-h-[3.5rem] items-start gap-3 rounded-[8px] bg-info-wash px-4 py-3 text-info">
      <span aria-hidden className="mt-[0.2rem] inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-info text-[0.7rem] font-bold">
        i
      </span>
      <p className="text-[0.95rem]">
        {recalls === undefined ? (
          <span className="text-muted">Recalls issued for this model and year appear here after a decode.</span>
        ) : recalls === null ? (
          <>Recalls issued for this model and year could not be read. This does not affect the registration.</>
        ) : (
          <>
            <span className="font-bold">
              Recalls issued for this model and year{vehicle ? ` (${vehicle})` : ""}: {recalls.total}
            </span>
            <span className="block text-[0.88rem]">
              For information only. It is not a check of this vehicle and is not part of the registration.
            </span>
          </>
        )}
      </p>
    </div>
  );
}
