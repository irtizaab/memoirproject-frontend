/**
 * Pure helpers over stored media. No React, no I/O.
 */

import type { MediaAsset } from "@/features/media/schemas";

/** Statuses that will never change again, so nothing needs to watch them. */
const TERMINAL = new Set(["done", "failed", "skipped"]);

/**
 * `102000` → `"1:42"`. Milliseconds, because that is what the browser reports
 * and what the column stores.
 *
 * Returns null when nothing is known, so the caller renders no length at all
 * rather than a confident "0:00" over a recording of unknown duration —
 * `duration_ms` is nullable, and an older asset may predate it being sent.
 */
export function formatDuration(ms: number | null | undefined): string | null {
  if (!ms || ms <= 0) return null;

  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * The combined length of a set of recordings, or null if any is unknown.
 *
 * All or nothing on purpose: a total that quietly omits the one recording
 * whose length was never recorded is worse than no total, because it reads as
 * complete.
 */
export function totalDuration(
  assets: { duration_ms: number | null }[],
): string | null {
  if (assets.length === 0) return null;
  if (assets.some((asset) => !asset.duration_ms)) return null;

  return formatDuration(
    assets.reduce((sum, asset) => sum + (asset.duration_ms ?? 0), 0),
  );
}

/**
 * Whether anything in this set of memories is still being transcribed.
 *
 * The signal the archive polls on. It is deliberately a question about a whole
 * list rather than one asset: the hook that uses it decides whether to refetch
 * the *page*, and one recording still in flight is reason enough.
 *
 * Returns false for an archive of photographs, for a memoir whose transcripts
 * are all finished, and for one where transcription is switched off — so the
 * ordinary case costs nothing.
 */
export function hasPendingTranscript(
  memories: { assets: MediaAsset[] }[] | undefined,
): boolean {
  if (!memories) return false;

  return memories.some((memory) =>
    memory.assets.some(
      (asset) => asset.transcript && !TERMINAL.has(asset.transcript.status),
    ),
  );
}
