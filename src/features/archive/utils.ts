/**
 * Formatting helpers for the archive. Pure functions, no React.
 *
 * They live in the feature rather than `src/utils/` because every one of them
 * encodes a product decision — how a subject's years read, what a memory kind
 * is called — rather than being generic string work.
 */

import type { MemoirSummary } from "@/features/account";
import type { MemoryKind } from "@/features/archive/schemas";

/**
 * The subject's years, in the four shapes the columns can produce.
 *
 *   1938 – 2021     both known
 *   1938 – Present  still living
 *   born 1938       no end year, and not marked living
 *   died 2021       an end year but no beginning
 *
 * Returns null when nothing was recorded, so the caller renders no line at all
 * rather than an empty dash.
 */
export function formatYears(memoir: {
  born_year: number | null;
  through_year: number | null;
  subject_is_living: boolean | null;
}): string | null {
  const { born_year, through_year, subject_is_living } = memoir;

  if (born_year && through_year) return `${born_year} – ${through_year}`;
  if (born_year && subject_is_living) return `${born_year} – Present`;
  if (born_year) return `born ${born_year}`;
  if (through_year) return `died ${through_year}`;
  return null;
}

/**
 * `"1988-08-12"` → `"12 August 1988"`.
 *
 * Parsed as a plain date rather than through `new Date("1988-08-12")`, which
 * treats a bare date as UTC midnight and can render as the 11th for anyone
 * west of Greenwich. A date somebody typed is not a moment in time.
 */
export function formatHappenedOn(iso: string | null): string | null {
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** The eyebrow above a memory card: "VOICE NOTE", "PHOTO MEMORY", … */
export function labelForKind(kind: MemoryKind): string {
  if (kind === "voice") return "Voice note";
  if (kind === "photo") return "Photo memory";
  return "Written memory";
}

/**
 * `"Nusrat Bibi"` → `"NUSRAT BIBI'S LIVING ARCHIVE"`.
 *
 * A name ending in s takes a bare apostrophe — "Yunus' living archive", not
 * "Yunus's". It is somebody's grandmother's name; getting it wrong is the kind
 * of small carelessness this product cannot afford.
 */
export function archiveEyebrow(memoir: MemoirSummary | null): string {
  const name = memoir?.subject_name?.trim();
  if (!name) return "Your living archive";

  const possessive = name.endsWith("s") ? `${name}'` : `${name}'s`;
  return `${possessive} living archive`;
}

/**
 * The archive's headline: `"Nusrat Bibi's living archive."`
 *
 * The **subject** headlines this page, never the account owner. It is their
 * memoir; the person reading it is only its keeper, and a page titled "Your
 * archive" quietly makes it about the wrong person.
 *
 * Falls back to a line that says the same thing without a name, for the moment
 * before `GET /me` answers.
 */
export function archiveTitle(memoir: MemoirSummary | null): string {
  const name = memoir?.subject_name?.trim();
  if (!name) return "A life, held close.";

  const possessive = name.endsWith("s") ? `${name}'` : `${name}'s`;
  return `${possessive} living archive.`;
}

/** `1610612736` → `"1.5 GB"`. Used by the storage meter. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  // One decimal below 10, none above — "3.2 GB" and "512 MB" both read
  // cleanly, "512.4 MB" is noise.
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/**
 * `6120000` → `"1h 42m"`. The statistics bar's cut of a duration.
 *
 * `formatDuration` in `features/media` is the other one, and they are not
 * interchangeable: that reads a single recording as `"1:42"`, which for a
 * memoir's worth of audio would say `"102:00"`. Whole minutes only — this is
 * reassurance that something is accumulating, not a measurement.
 */
function formatSpan(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/**
 * The four cells of the archive's statistics bar.
 *
 * `docs/DESIGN-SYSTEM.md` §7 is explicit about what this is for: **reassurance
 * that this is working, not measurement.** So there is no total to be a
 * fraction of, no target, and nothing here is a rate. Four plain facts about
 * what the archive currently holds.
 *
 * Every one is derived from the memories the archive already fetched — no new
 * endpoint, and no cell that has to be filled with a guess. "Voices" counts
 * distinct participants who left a recording, not recordings: three voice notes
 * from one son is one voice.
 */
export function archiveStats(
  memories: {
    participant_id: string;
    assets: { kind: string; duration_ms: number | null }[];
  }[],
): { n: string; label: string }[] {
  let photographs = 0;
  let recordedMs = 0;
  const voices = new Set<string>();

  for (const memory of memories) {
    for (const asset of memory.assets) {
      if (asset.kind === "image") photographs += 1;
      if (asset.kind === "audio") {
        recordedMs += asset.duration_ms ?? 0;
        voices.add(memory.participant_id);
      }
    }
  }

  return [
    { n: String(memories.length), label: "Memories" },
    { n: String(photographs), label: "Photographs" },
    { n: recordedMs > 0 ? formatSpan(recordedMs) : "—", label: "Recorded" },
    { n: String(voices.size), label: "Voices" },
  ];
}

/**
 * The printed byline: `"Yusuf Ali, his friend"`.
 *
 * A memory's `contributor_relationship` is stored from the contributor's own
 * point of view — they said the subject was "my friend" — so it is turned round
 * here to read from the page's. `other` and anything unrecognised contribute
 * nothing rather than "other", which is what the credit lines used to say.
 */
export function tellerLine(memory: {
  contributor_name: string;
  contributor_relationship: string;
}): string {
  const kinship: Record<string, string> = {
    child: "their child",
    grandchild: "their grandchild",
    spouse_partner: "their partner",
    parent: "their parent",
    sibling: "their sibling",
    friend: "their friend",
    colleague: "their colleague",
    neighbour: "their neighbour",
  };

  const relation = kinship[memory.contributor_relationship];
  return relation
    ? `${memory.contributor_name}, ${relation}`
    : memory.contributor_name;
}
