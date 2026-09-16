/**
 * Formatting and text arithmetic for the reader.
 *
 * The one piece worth reading carefully is `segment()`. Everything else is
 * turning numbers into the words a printed book would use.
 */

import type {
  Block,
  BlockSource,
  ChapterSummary,
  CommentThread,
  MemoirReading,
} from "@/features/memoir/schemas";

const ROMAN: ReadonlyArray<readonly [number, string]> = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** "Chapter IV". Books number their chapters this way and this is a book. */
export function roman(n: number): string {
  if (n < 1) return "";
  let left = n;
  let out = "";
  for (const [value, numeral] of ROMAN) {
    while (left >= value) {
      out += numeral;
      left -= value;
    }
  }
  return out;
}

/** "1928 — 1934", or one year, or nothing. */
export function chapterYears(chapter: {
  from_year: number | null;
  through_year: number | null;
}): string | null {
  const { from_year: from, through_year: through } = chapter;
  if (from && through) return `${from} — ${through}`;
  return from ? `${from}` : through ? `${through}` : null;
}

/**
 * The dates under the subject's name.
 *
 * A living subject reads "1936 — Present". The book cover elsewhere in the
 * product always reads "— Forever" and deliberately never shows a death year;
 * this is the masthead rather than the cover, where the real span is the point.
 */
export function lifespan(reading: MemoirReading): string | null {
  const { born_year: born, through_year: through, subject_is_living } = reading;
  if (born && through) return `${born} — ${through}`;
  if (born && subject_is_living) return `${born} — Present`;
  return born ? `${born}` : null;
}

/** "0:47". Milliseconds, as a recording's length is always written. */
export function duration(ms: number | null): string | null {
  if (!ms || ms <= 0) return null;
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

/** "Voice · 1994 · 0:47" — one credit line, in the order the eye wants it. */
/**
 * The footnote numeral for each source that covers a *span* of the paragraph,
 * in the order the margin lists them. A whole-block source gets none: there is
 * no phrase to put a mark after, and the margin says "whole passage" instead.
 */
export function footnotes(sources: BlockSource[]): Map<string, number> {
  const notes = new Map<string, number>();
  for (const source of sources) {
    if (source.start_offset !== null && source.end_offset !== null) {
      notes.set(source.id, notes.size + 1);
    }
  }
  return notes;
}

export function credit(source: BlockSource): string {
  const medium =
    source.medium === "voice"
      ? "Voice"
      : source.medium === "photo"
        ? "Photograph"
        : "Written";

  return [medium, source.year, duration(source.duration_ms)]
    .filter(Boolean)
    .join(" · ");
}

/**
 * "Told by Margaret Reyes, Thomas Marsh and four others."
 *
 * Named up to three, then counted, and the count is spelled out — the copy
 * voice writes numbers as words in prose and as digits in data.
 */
const WORDS = [
  "no one",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

export function spell(n: number): string {
  return WORDS[n] ?? String(n);
}

export function toldBy(names: string[], named = 3): string | null {
  if (names.length === 0) return null;
  const shown = names.slice(0, named);
  const rest = names.length - shown.length;

  if (rest === 0) {
    if (shown.length === 1) return shown[0];
    return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  }
  return `${shown.join(", ")} and ${spell(rest)} other${rest === 1 ? "" : "s"}`;
}

/**
 * How a person is described beside their name.
 *
 * `relationship_group` is a database enum and two of its six values are not
 * English. `other` is the default every contributor gets when nobody asked, so
 * it means "unstated" rather than "other" — printing it under somebody's name
 * in a memoir reads as a category they were put in. Null, and the name stands
 * alone.
 */
const RELATIONSHIPS: Record<string, string> = {
  child: "Child",
  grandchild: "Grandchild",
  spouse_partner: "Partner",
  friend: "Friend",
  self: "Themselves",
};

export function relationshipLabel(relationship: string): string | null {
  return RELATIONSHIPS[relationship] ?? null;
}

/** Where a chapter falls in the life, as a fraction of the whole span. */
export function chapterSpan(
  chapter: ChapterSummary,
  reading: MemoirReading,
): { left: number; width: number } | null {
  const born = reading.born_year;
  const died = reading.through_year ?? new Date().getFullYear();
  if (!born || !chapter.from_year || died <= born) return null;

  const whole = died - born;
  const from = Math.max(chapter.from_year, born);
  const to = Math.min(chapter.through_year ?? from, died);

  return {
    left: ((from - born) / whole) * 100,
    width: (Math.max(to - from, 0) / whole) * 100,
  };
}

/* -------------------------------------------------------------------------
 * Text arithmetic
 * ------------------------------------------------------------------------- */

/** One run of characters, and everything anchored to it. */
export type Run = {
  text: string;
  /** `block_source.id` of every source covering this run. */
  sources: string[];
  /** `comment_thread.id` of every thread covering this run. */
  threads: string[];
};

type Mark = {
  id: string;
  kind: "source" | "thread";
  start: number;
  end: number;
};

/**
 * Splits a paragraph into runs, each knowing which sources and which comment
 * threads cover it.
 *
 * This is what lets hovering a credit in the margin underline the exact clause
 * it fathered, and lets clicking commented text focus its thread — both of them
 * without wrapping the prose in nested spans the browser would have to
 * reconcile.
 *
 * A boundary sweep rather than nesting, because the two kinds of anchor
 * **overlap freely**: a comment can be left on half of a sentence one person
 * supplied, and the paragraph still has to render as one continuous line of
 * type. Collecting every start and end, sorting them, and asking which marks
 * cover each gap handles overlap for free; nesting spans does not.
 *
 * Marks outside the text are ignored rather than clamped. The backend refuses
 * to store one, so a span past the end means the text and its anchors have
 * drifted — and quietly highlighting the wrong words would be worse than
 * highlighting none.
 */
export function segment(
  text: string,
  sources: BlockSource[],
  threads: CommentThread[],
): Run[] {
  const marks: Mark[] = [];

  for (const source of sources) {
    if (source.start_offset === null || source.end_offset === null) continue;
    if (source.end_offset > text.length) continue;
    marks.push({
      id: source.id,
      kind: "source",
      start: source.start_offset,
      end: source.end_offset,
    });
  }

  for (const thread of threads) {
    if (thread.start_offset === null || thread.end_offset === null) continue;
    if (thread.end_offset > text.length) continue;
    marks.push({
      id: thread.id,
      kind: "thread",
      start: thread.start_offset,
      end: thread.end_offset,
    });
  }

  if (marks.length === 0) return [{ text, sources: [], threads: [] }];

  const boundaries = new Set<number>([0, text.length]);
  for (const mark of marks) {
    boundaries.add(mark.start);
    boundaries.add(mark.end);
  }

  const edges = [...boundaries].sort((a, b) => a - b);
  const runs: Run[] = [];

  for (let i = 0; i < edges.length - 1; i += 1) {
    const start = edges[i];
    const end = edges[i + 1];
    if (end <= start) continue;

    const covering = marks.filter((m) => m.start <= start && m.end >= end);
    runs.push({
      text: text.slice(start, end),
      sources: covering.filter((m) => m.kind === "source").map((m) => m.id),
      threads: covering.filter((m) => m.kind === "thread").map((m) => m.id),
    });
  }

  return runs;
}

/** Every thread about a block, however it is anchored. Ordered as it arrived. */
export function threadsForBlock(
  blockId: string,
  threads: CommentThread[],
): CommentThread[] {
  return threads.filter((t) => t.block_id === blockId);
}

/** The figures anchored to one paragraph, by placement. */
export function figuresFor(
  blockId: string,
  blocks: Block[],
  placement: "margin" | "inset" | "carousel",
): Block[] {
  return blocks.filter(
    (b) =>
      b.kind === "figure" &&
      b.figure?.anchor_block_id === blockId &&
      b.figure.placement === placement,
  );
}
