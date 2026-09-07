/**
 * Searching a memoir, from either side of it.
 *
 * Two functions and one response shape, because the owner and the family ask
 * the same question of the same corpus. What differs is the proof: a Supabase
 * bearer token from the archive, or a view link plus a reader session from the
 * book. That difference lives here and nowhere above it — the screen does not
 * know which one it is showing.
 */

import { apiRequest, type ApiRequestCaching } from "@/lib/api/client";
import { authHeaders } from "@/lib/supabase/client";
import {
  searchResultsSchema,
  type SearchResults,
} from "@/features/search/schemas";

const ENDPOINTS = {
  archive: (memoirId: string) => `/memoirs/${memoirId}/search`,
  reader: (token: string) => `/r/${encodeURIComponent(token)}/search`,
} as const;

type RequestOptions = ApiRequestCaching & { signal?: AbortSignal };

/** Search as the owner, from the archive. */
export async function searchArchive(
  memoirId: string,
  query: string,
  options: RequestOptions = {},
): Promise<SearchResults> {
  return apiRequest({
    path: `${ENDPOINTS.archive(memoirId)}?q=${encodeURIComponent(query)}`,
    method: "GET",
    headers: await authHeaders(),
    schema: searchResultsSchema,
    cache: "no-store",
    ...options,
  });
}

/**
 * Search as a reader, from inside the book.
 *
 * Both headers, for the reason every other reader call needs both: the link
 * says which memoir, the session says who is holding it. A forwarded link is
 * not a way to search a family's memoir.
 */
export async function searchMemoir(
  token: string,
  reader: string,
  query: string,
  options: RequestOptions = {},
): Promise<SearchResults> {
  return apiRequest({
    path: `${ENDPOINTS.reader(token)}?q=${encodeURIComponent(query)}`,
    method: "GET",
    headers: { "X-Link-Token": token, "X-Reader-Token": reader },
    schema: searchResultsSchema,
    cache: "no-store",
    ...options,
  });
}
