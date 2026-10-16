/**
 * The Department of Vehicle Services' mark: a disc with a bar across it,
 * drawn in whatever colour it sits on. No crest, flag or seal.
 * The brand lives here and in globals.css; nothing else in the app knows it.
 */
export function AgencyMark({ className = "size-7", cut = "#ffffff" }: { className?: string; cut?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={className}>
      <circle cx="10" cy="10" r="9" fill="currentColor" />
      <rect x="5.5" y="9" width="9" height="2" rx="1" fill={cut} />
      <rect x="9" y="5.5" width="2" height="9" rx="1" fill={cut} opacity="0.6" />
    </svg>
  );
}

/** The agency name with its mark. `tone="band"` is white on the black header. */
export function AgencyWordmark({ tone = "ink", sub }: { tone?: "ink" | "band"; sub?: string }) {
  const band = tone === "band";
  return (
    <span className={`inline-flex items-center gap-3 ${band ? "text-band-text" : "text-ink"}`}>
      <AgencyMark cut={band ? "#0e1116" : "#ffffff"} />
      <span className="flex flex-col leading-tight">
        <span className="text-[1.02rem] font-bold tracking-[-0.005em]">
          <span className="hidden sm:inline">Department of </span>Vehicle Services
        </span>
        {sub && <span className={`text-[0.8rem] ${band ? "text-band-muted" : "text-muted"}`}>{sub}</span>}
      </span>
    </span>
  );
}

/** The credit the data provider asks for, kept small. */
export function CardogCredit({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://cardog.app/docs"
      target="_blank"
      rel="noreferrer"
      className={`text-[0.78rem] text-muted hover:text-ink ${className}`}
    >
      VIN decode by Cardog
    </a>
  );
}
