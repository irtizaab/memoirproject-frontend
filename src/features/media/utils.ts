/**
 * Pure helpers over stored media. No React, no I/O.
 */

import type { MediaAsset } from "@/features/media/schemas";

/** Statuses that will never change again, so nothing needs to watch them. */
const TERMINAL = new Set(["done", "failed", "skipped"]);

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
