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
