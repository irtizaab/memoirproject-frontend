/**
 * The archive's calls to the backend.
 *
 * The only file that knows these paths exist. Everything goes through
 * `apiRequest`, which owns the base URL, the timeout, and validating the
 * response before it is allowed any further into the app.
 */

import { z } from "zod";

import { apiDownload, apiRequest, type ApiRequestCaching } from "@/lib/api/client";
import { authHeaders } from "@/lib/supabase/client";
import {
  assemblyResultSchema,
  memoirPublicationSchema,
  memoryCreateSchema,
  memorySchema,
  type AssemblyResult,
  type MemoirPublication,
  type Memory,
  type MemoryCreate,
} from "@/features/archive/schemas";

const ENDPOINTS = {
  memories: (memoirId: string) => `/memoirs/${memoirId}/memories`,
  memory: (memoryId: string) => `/memories/${memoryId}`,
  assets: (memoryId: string) => `/memories/${memoryId}/assets`,
  asset: (memoryId: string, assetId: string) =>
    `/memories/${memoryId}/assets/${assetId}`,
} as const;

/**
 * The memoir as a whole, rather than the memories in it.
 *
 * Kept apart from `ENDPOINTS` above because they answer different questions —
 * one is "what has been collected", the other is "what becomes of it".
 */
const BOOK = {
  assemble: (memoirId: string) => `/memoirs/${memoirId}/assemble`,
  publish: (memoirId: string) => `/memoirs/${memoirId}/publish`,
  passphrase: (memoirId: string) => `/memoirs/${memoirId}/passphrase`,
  export: (memoirId: string) => `/memoirs/${memoirId}/export.pdf`,
} as const;

type RequestOptions = ApiRequestCaching & { signal?: AbortSignal };

/** Every memory in the memoir, newest first. */
export async function listMemories(
  memoirId: string,
  options: RequestOptions = {},
): Promise<Memory[]> {
  return apiRequest({
    path: ENDPOINTS.memories(memoirId),
    method: "GET",
    headers: await authHeaders(),
    schema: memorySchema.array(),
    // Per-user, and stale the moment anyone contributes.
    cache: "no-store",
    ...options,
  });
}

/**
 * Records a memory the owner wrote.
 *
 * Any media is uploaded first, by `features/media`, and arrives here as
 * `asset_ids`. Validated on the way out as well as the way in, so a malformed
 * payload fails at the call site with a readable message rather than as a 422.
 */
export async function createMemory(
  memoirId: string,
  memory: MemoryCreate,
  options: RequestOptions = {},
): Promise<Memory> {
  const body = memoryCreateSchema.parse(memory);

  return apiRequest({
    path: ENDPOINTS.memories(memoirId),
    method: "POST",
    body,
    headers: await authHeaders(),
    schema: memorySchema,
    ...options,
  });
}

/**
 * Edits a memory.
 *
 * Only the keys present are changed — the backend uses `exclude_unset`, so
 * sending just a title leaves the body alone. Answers 409 once the memoir is
 * published, because published memoirs never change.
 */
export async function updateMemory(
  memoryId: string,
  patch: { title?: string | null; body_text?: string | null; happened_on?: string | null },
  options: RequestOptions = {},
): Promise<Memory> {
  return apiRequest({
    path: ENDPOINTS.memory(memoryId),
    method: "PATCH",
    body: patch,
    headers: await authHeaders(),
    schema: memorySchema,
    ...options,
  });
}

/**
 * Removes a memory and the files it held.
 *
 * The backend answers 204 with no body. `apiRequest` recognises that and hands
 * the schema `undefined`, so the contract is declared honestly rather than by
 * pretending something came back.
 */
export async function deleteMemory(
  memoryId: string,
  options: RequestOptions = {},
): Promise<void> {
  await apiRequest({
    path: ENDPOINTS.memory(memoryId),
    method: "DELETE",
    headers: await authHeaders(),
    schema: z.undefined(),
    ...options,
  });
}


/**
 * Adds already-uploaded photographs or recordings to an existing memory.
 *
 * The upload still happens first, by `features/media`, exactly as it does when
 * a memory is created — a file needs somewhere to go before it can be attached
 * to anything. This call adopts the ids that came back.
 *
 * Returns the memory as it now stands, including a possibly-changed `kind`:
 * adding a recording to a written memory makes it a voice memory, and the
 * backend works that out rather than the client guessing.
 */
export async function attachAssets(
  memoryId: string,
  assetIds: string[],
  options: RequestOptions = {},
): Promise<Memory> {
  return apiRequest({
    path: ENDPOINTS.assets(memoryId),
    method: "POST",
    body: { asset_ids: assetIds },
    headers: await authHeaders(),
    schema: memorySchema,
    ...options,
  });
}

/**
 * Removes one photograph or recording, and deletes the file behind it.
 *
 * Returns the memory rather than nothing, because what is left still exists
 * and its `kind` may have just changed.
 *
 * Answers 400 if this would leave the memory empty — the same rule as
 * creating one. Nothing is deleted in that case, so the caller can surface the
 * message and the file is still there.
 */
export async function removeAsset(
  memoryId: string,
  assetId: string,
  options: RequestOptions = {},
): Promise<Memory> {
  return apiRequest({
    path: ENDPOINTS.asset(memoryId, assetId),
    method: "DELETE",
    headers: await authHeaders(),
    schema: memorySchema,
    ...options,
  });
}

/**
 * One memory in full.
 *
 * The list already carries everything this returns, so the detail page usually
 * renders from cache and never calls it. It is here for a link opened directly
 * and for a refresh — the two cases a cache cannot serve.
 */
export async function getMemory(
  memoryId: string,
  options: RequestOptions = {},
): Promise<Memory> {
  return apiRequest({
    path: ENDPOINTS.memory(memoryId),
    method: "GET",
    headers: await authHeaders(),
    schema: memorySchema,
    cache: "no-store",
    ...options,
  });
}

/* -------------------------------------------------------------------------
 * The book
 * ------------------------------------------------------------------------- */

/**
 * Turn everything in the archive into chapters.
 *
 * Owner only, and re-runnable while the memoir is a draft: the owner adds
 * memories and runs it again, and the whole book is rebuilt from what is there
 * now. Once published it is refused — every reflection in a sealed memoir is
 * anchored to characters in text that can never move.
 */
export async function assembleMemoir(
  memoirId: string,
  options: RequestOptions = {},
): Promise<AssemblyResult> {
  return apiRequest({
    path: BOOK.assemble(memoirId),
    method: "POST",
    headers: await authHeaders(),
    schema: assemblyResultSchema,
    ...options,
  });
}

/**
 * Seal the memoir and protect it with a passphrase.
 *
 * The most irreversible request in the product. The response carries the view
 * token and never the passphrase — the owner chose it and passes it on
 * themselves.
 */
export async function publishMemoir(
  memoirId: string,
  passphrase: string,
  options: RequestOptions = {},
): Promise<MemoirPublication> {
  return apiRequest({
    path: BOOK.publish(memoirId),
    method: "POST",
    body: { passphrase },
    headers: await authHeaders(),
    schema: memoirPublicationSchema,
    ...options,
  });
}

/**
 * Replace the passphrase.
 *
 * There is no route that reads the old one back, because nothing in the
 * building can. Replacing locks out everyone who was told the previous one,
 * which is what somebody asking for this actually wants.
 */
export async function replacePassphrase(
  memoirId: string,
  passphrase: string,
  options: RequestOptions = {},
): Promise<undefined> {
  return apiRequest({
    path: BOOK.passphrase(memoirId),
    method: "PUT",
    body: { passphrase },
    headers: await authHeaders(),
    schema: z.undefined(),
    ...options,
  });
}

/**
 * The memoir as a PDF.
 *
 * `apiDownload` rather than `apiRequest`: the response is a file, and the rule
 * that nothing unvalidated enters the app is kept by bytes on their way to a
 * download being outside it rather than exempt from it.
 */
export async function exportMemoirPdf(
  memoirId: string,
): Promise<{ blob: Blob; filename: string | null }> {
  return apiDownload({
    path: BOOK.export(memoirId),
    headers: await authHeaders(),
  });
}
