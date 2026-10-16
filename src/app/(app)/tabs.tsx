"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export interface Tab {
  href: string;
  label: string;
  /** A number to show beside the label, e.g. checks waiting. */
  count?: number;
  /** A one-key shortcut shown on the tab (Alt + key). */
  key?: string;
}

/** The tab row. The active tab carries a thick bar, not just a colour. */
export function Tabs({ tabs }: { tabs: Tab[] }) {
  const path = usePathname();
  return (
    <>
      {tabs.map((t) => {
        const active = path === t.href || path.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            aria-keyshortcuts={t.key ? `Alt+${t.key}` : undefined}
            className={`relative flex shrink-0 items-center gap-2 px-3 font-bold sm:px-4 ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={`inline-flex h-6 min-w-6 items-center justify-center rounded-[4px] px-1.5 text-[0.8rem] tabular-nums ${
                  t.count > 0 ? "bg-stop text-white" : "bg-canvas text-muted"
                }`}
              >
                {t.count}
              </span>
            )}
            <span
              aria-hidden
              className={`absolute inset-x-2 bottom-[-2px] h-[5px] ${active ? "bg-act" : "bg-transparent"}`}
            />
          </Link>
        );
      })}
      <TabKeys tabs={tabs} />
    </>
  );
}

/** Alt + the tab's key moves between screens without the mouse. */
function TabKeys({ tabs }: { tabs: Tab[] }) {
  const router = useRouter();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;
      const t = tabs.find((t) => t.key && e.code === `Key${t.key.toUpperCase()}`);
      if (t) {
        e.preventDefault();
        router.push(t.href);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tabs, router]);
  return null;
}
