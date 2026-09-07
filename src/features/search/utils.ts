/**
 * Reading an excerpt, and naming what was found.
 */

import type { SearchKind } from "@/features/search/schemas";

/**
 * The two control characters `ts_headline` wraps a match in.
 *
 * They are here rather than `<mark>` because an excerpt is built from text a
 * reader typed — a reflection, a caption — and marking it up on the server
 * would mean this app rendering user input as markup. Splitting on a character
 * that cannot occur in anything typed on a phone gives the same highlight with
 * none of that.
 */
const START = "\u0002";
const END = "\u0003";

export type Run = { text: string; match: boolean };

/**
 * An excerpt as alternating plain and matched runs.
 *
 * Written as a scan rather than a `split` on each delimiter so that an
 * unbalanced pair — which should not happen, and would be a Postgres bug if it
 * did — degrades into plain text instead of losing the rest of the sentence.
 */
export function highlight(excerpt: string): Run[] {
  const runs: Run[] = [];
  let rest = excerpt;

  while (rest.length > 0) {
    const open = rest.indexOf(START);
    if (open === -1) break;

    const close = rest.indexOf(END, open);
    if (close === -1) break;

    if (open > 0) runs.push({ text: rest.slice(0, open), match: false });
    runs.push({ text: rest.slice(open + 1, close), match: true });
    rest = rest.slice(close + 1);
  }

  if (rest.length > 0) runs.push({ text: rest, match: false });
  return runs;
}

/**
 * What a hit is called on the filter chips and above a result.
 *
 * Plain nouns a family would use. "Reflection" rather than "comment" because
 * that is what the reader calls the layer, and two words for one thing is how
 * a person starts wondering whether they are two things.
 */
export const KIND_LABELS: Record<SearchKind, string> = {
  chapter: "Stories & chapters",
  photo: "Photographs",
  recording: "Recordings",
  reflection: "Family reflections",
};

/** The singular, for the label above one result. */
export const KIND_NAMES: Record<SearchKind, string> = {
  chapter: "Story",
  photo: "Photograph",
  recording: "Recording",
  reflection: "Reflection",
};

/** The order the filters are shown in: the book first, the margins last. */
export const KIND_ORDER: SearchKind[] = [
  "chapter",
  "photo",
  "recording",
  "reflection",
];
