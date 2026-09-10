/**
 * The contract for stored media — the twin of the backend's `MediaAsset`,
 * `UploadRequest` and `UploadTicket` in `src/models/memory_models.py`.
 *
 * Its own feature because two very different screens upload: the owner's
 * composer and the contributor's page. Neither should import the other's
 * internals to get a file into storage.
 */

import { z } from "zod";

/** Mirrors the `asset_kind` enum. Coarser than a memory's kind, on purpose. */
export const assetKindSchema = z.enum(["image", "audio"]);

/**
 * Mirrors `TranscriptSegment` — one paragraph, and where it falls in the
 * recording.
 *
 * Milliseconds, matching `duration_ms`. Paragraphs and not words: the
 * word-level array the provider can return is roughly 750 KB per hour of
 * audio, fifteen times the transcript itself, and the backend deliberately
 * never asks for it. `start`/`end` are nullable because a provider that
 * returns text without timings is still returning a usable transcript.
 */
export const transcriptSegmentSchema = z.object({
  start: z.number().int().nullable(),
  end: z.number().int().nullable(),
  text: z.string(),
});

/**
 * Mirrors `Transcript`. What was said in a recording.
 *
 * `status` is the field to key off, not the presence of `text`. A transcript
 * that is still being made, and one that failed, both have no text and mean
 * completely different things to a reader.
 *
 * Note what the backend does not send: `provider_id` (an internal job handle)
 * and `error` (the provider's own message, which is for the log).
 */
export const transcriptSchema = z.object({
  status: z.enum(["queued", "processing", "done", "failed", "skipped"]),
  text: z.string().nullable().default(null),
  segments: z.array(transcriptSegmentSchema).nullable().default(null),
  language_code: z.string().nullable().default(null),
  confidence: z.number().nullable().default(null),
});

/**
 * Mirrors `MediaAsset`.
 *
 * `url` is a freshly signed link that expires — the bucket is private, so
 * there is no permanent address for any of this. It can be null when signing
 * failed, which renders as a gap rather than taking the page down.
 *
 * Note `storage_path` is absent. The backend deliberately does not send it.
 */
export const mediaAssetSchema = z.object({
  id: z.uuid(),
  kind: assetKindSchema,
  mime_type: z.string(),
  byte_size: z.number().int(),
  duration_ms: z.number().int().nullable(),
  url: z.url().nullable(),
  /**
   * Audio only, and null even then until a job exists for it. Every reader
   * has to cope with its absence — a recording without a transcript is still
   * a recording, and the player works either way.
   */
  transcript: transcriptSchema.nullable().default(null),
});

/** Mirrors `UploadTicket` — where to PUT, and what the asset will be called. */
export const uploadTicketSchema = z.object({
  asset_id: z.uuid(),
  upload_url: z.url(),
});

export type AssetKind = z.infer<typeof assetKindSchema>;
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export type Transcript = z.infer<typeof transcriptSchema>;
export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>;
export type UploadTicket = z.infer<typeof uploadTicketSchema>;

/**
 * How the caller proves it may upload.
 *
 * Exactly one of these is used per request, and they are the two kinds of
 * person who can add to a memoir. An owner's bearer token is attached by
 * `authHeaders()`; a contributor has only the token from the URL they were
 * sent.
 */
export type UploadCredential =
  { kind: "owner" } | { kind: "link"; linkToken: string };
