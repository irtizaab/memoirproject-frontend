/**
 * Uploads: the three-step dance, and the one place it is written down.
 *
 *   1. POST /media/uploads              reserve a row, get a one-shot URL
 *   2. PUT  <that url>                  the file goes straight to storage
 *   3. POST /media/uploads/{id}/complete  confirm, and record the real size
 *
 * Step 2 is the exception to "only `lib/api/client.ts` calls fetch". That rule
 * exists so every call to OUR backend shares one base URL, one timeout and one
 * error shape. This request goes to Supabase Storage instead, at an absolute
 * signed URL, carrying raw bytes rather than JSON — `apiRequest` would have to
 * be bent out of shape to express it, and the result would be less clear than
 * the twelve lines below.
 */

import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { authHeaders } from "@/lib/supabase/client";
import {
  mediaAssetSchema,
  uploadTicketSchema,
  type AssetKind,
  type MediaAsset,
  type UploadCredential,
  type UploadTicket,
} from "@/features/media/schemas";

const ENDPOINTS = {
  uploads: "/media/uploads",
  complete: (assetId: string) => `/media/uploads/${assetId}/complete`,
} as const;

/** Turns a credential into the headers that prove it. */
async function credentialHeaders(
  credential: UploadCredential,
): Promise<Record<string, string>> {
  return credential.kind === "owner"
    ? await authHeaders()
    : { "X-Link-Token": credential.linkToken };
}

async function beginUpload(
  memoirId: string,
  kind: AssetKind,
  mimeType: string,
  credential: UploadCredential,
  extras: { original_filename?: string; duration_ms?: number } = {},
): Promise<UploadTicket> {
  return apiRequest({
    path: ENDPOINTS.uploads,
    method: "POST",
    body: {
      memoir_id: memoirId,
      kind,
      mime_type: mimeType,
      ...extras,
    },
    headers: await credentialHeaders(credential),
    schema: uploadTicketSchema,
  });
}

async function completeUpload(
  assetId: string,
  credential: UploadCredential,
): Promise<MediaAsset> {
  return apiRequest({
    path: ENDPOINTS.complete(assetId),
    method: "POST",
    headers: await credentialHeaders(credential),
    schema: mediaAssetSchema,
  });
}

/**
 * Puts one file in storage and returns the confirmed asset.
 *
 * The whole three-step sequence, so callers never have to know it has three
 * steps. Returns the asset id the composer then hands to `createMemory` as
 * `asset_ids` — the upload has to happen first, because a file needs somewhere
 * to go before there is a memory to attach it to.
 */
export async function uploadFile(
  file: Blob,
  {
    memoirId,
    kind,
    credential,
    filename,
    durationMs,
  }: {
    memoirId: string;
    kind: AssetKind;
    credential: UploadCredential;
    filename?: string;
    durationMs?: number;
  },
): Promise<MediaAsset> {
  const mimeType = file.type || (kind === "image" ? "image/jpeg" : "audio/webm");

  const ticket = await beginUpload(memoirId, kind, mimeType, credential, {
    ...(filename ? { original_filename: filename } : {}),
    ...(durationMs ? { duration_ms: Math.round(durationMs) } : {}),
  });

  const response = await fetch(ticket.upload_url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": mimeType },
  });

  if (!response.ok) {
    // Normalised into the app's own error type so a failed upload reads the
    // same as any other failure at the call site, rather than as a bare
    // Response nobody remembered to check.
    throw ApiError.http(
      ticket.upload_url,
      response.status,
      "the file could not be uploaded",
    );
  }

  return completeUpload(ticket.asset_id, credential);
}

/**
 * Uploads every photograph and recording for one memory, in parallel.
 *
 * Returns the asset ids in the order the memory should adopt them. Parallel
 * rather than sequential because a memory can now carry ten photographs, and
 * ten round trips one after another on a phone connection is the slower design
 * by a wide margin — the browser caps concurrency on its own.
 *
 * If any one upload fails the whole thing rejects, and the caller reports it.
 * The successful ones are left as unattached reservations: they count towards
 * nobody's storage and are swept up by the cleanup pass. Better than saving a
 * memory that is quietly missing a photograph the person watched them choose.
 */
export async function uploadAll(
  files: {
    blob: Blob;
    kind: AssetKind;
    filename?: string;
    durationMs?: number;
  }[],
  { memoirId, credential }: { memoirId: string; credential: UploadCredential },
): Promise<string[]> {
  if (files.length === 0) return [];

  const assets = await Promise.all(
    files.map((file) =>
      uploadFile(file.blob, {
        memoirId,
        kind: file.kind,
        credential,
        ...(file.filename ? { filename: file.filename } : {}),
        ...(file.durationMs ? { durationMs: file.durationMs } : {}),
      }),
    ),
  );

  return assets.map((asset) => asset.id);
}
