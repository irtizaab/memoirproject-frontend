/**
 * The archive's calls to the backend.
 *
 * The only file that knows these paths exist. Everything goes through
 * `apiRequest`, which owns the base URL, the timeout, and validating the
 * response before it is allowed any further into the app.
 */

import { z } from "zod";

import { apiRequest, type ApiRequestCaching } from "@/lib/api/client";
import { authHeaders } from "@/lib/supabase/client";
import {
  memoryCreateSchema,
  memorySchema,
  type Memory,
  type MemoryCreate,
} from "@/features/archive/schemas";

const ENDPOINTS = {
  memories: (memoirId: string) => `/memoirs/${memoirId}/memories`,
  memory: (memoryId: string) => `/memories/${memoryId}`,
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
