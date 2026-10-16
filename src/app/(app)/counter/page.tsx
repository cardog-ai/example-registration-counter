import { dataMode, FIXTURE_VINS } from "@/lib/cardog";
import { requireViewer } from "@/lib/session";
import { Counter } from "./counter";

export const metadata = { title: "Counter" };

export default async function CounterPage() {
  const me = await requireViewer();
  return (
    <>
      <div className="mx-auto mb-6 max-w-[860px]">
        <h1 className="text-[1.9rem] font-bold leading-tight sm:text-[2.2rem]">New registration</h1>
        <p className="mt-1 text-muted">
          {me.name} · {new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>
      <Counter samples={dataMode === "fixture" ? FIXTURE_VINS.map((v) => ({ ...v })) : null} />
    </>
  );
}
