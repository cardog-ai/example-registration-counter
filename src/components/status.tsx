/** A check's status: a word, a shape and a colour, never colour alone. */

export type CheckStatus = "clear" | "flagged" | "held" | "approved" | "returned";

const LOOK: Record<CheckStatus, { word: string; glyph: string; cls: string }> = {
  clear: { word: "Clear", glyph: "✓", cls: "bg-good-wash text-good border-good" },
  flagged: { word: "Flagged for review", glyph: "!", cls: "bg-flag-wash text-flag border-flag-edge" },
  held: { word: "Needs supervisor override", glyph: "■", cls: "bg-stop-wash text-stop border-stop" },
  approved: { word: "Approved by supervisor", glyph: "✓", cls: "bg-card text-good border-good" },
  returned: { word: "Returned to clerk", glyph: "↩", cls: "bg-card text-stop border-stop" },
};

export function StatusBadge({ status, short = false }: { status: CheckStatus; short?: boolean }) {
  const l = LOOK[status];
  return (
    <span className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-[4px] border-2 px-2.5 text-[0.85rem] font-bold ${l.cls}`}>
      <span aria-hidden className="inline-block w-[1ch] text-center">
        {l.glyph}
      </span>
      {short ? shortWord(status) : l.word}
    </span>
  );
}

function shortWord(s: CheckStatus) {
  return { clear: "Clear", flagged: "Flagged", held: "Override", approved: "Approved", returned: "Returned" }[s];
}

export const statusWord = (s: CheckStatus) => LOOK[s].word;
