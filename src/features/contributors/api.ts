/**
 * The contributors screen's calls to the backend.
 */

import { apiRequest, type ApiRequestCaching } from "@/lib/api/client";
import { authHeaders } from "@/lib/supabase/client";
import {
  contributorsOverviewSchema,
  mergeResultSchema,
  shareLinkSchema,
  type ContributorsOverview,
  type MergeResult,
  type ShareLink,
} from "@/features/contributors/schemas";

const ENDPOINTS = {
  contributors: (memoirId: string) => `/memoirs/${memoirId}/contributors`,
  reissue: (memoirId: string) => `/memoirs/${memoirId}/link/reissue`,
  merge: (memoirId: string, loserId: string, winnerId: string) =>
    `/memoirs/${memoirId}/contributors/${loserId}/merge-into/${winnerId}`,
} as const;

type RequestOptions = ApiRequestCaching & { signal?: AbortSignal };

/** Everyone in the memoir, plus the live link, in one response. */
export async function listContributors(
  memoirId: string,
  options: RequestOptions = {},
): Promise<ContributorsOverview> {
  return apiRequest({
    path: ENDPOINTS.contributors(memoirId),
    method: "GET",
    headers: await authHeaders(),
    schema: contributorsOverviewSchema,
    cache: "no-store",
    ...options,
  });
}

/**
 * Records that two entries in the contributors list are one person.
 *
 * The same human on a second device arrives as a second participant, because
 * identity is a token held in one browser. This is how the owner says so.
 *
 * Nothing is matched on names, here or on the backend: both ids are named
 * explicitly, because two people genuinely share a name and no rule could tell
 * two cousins called Ali apart. Not reversible — the UI says so first.
 */
export async function mergeContributors(
  memoirId: string,
  loserId: string,
  winnerId: string,
  options: RequestOptions = {},
): Promise<MergeResult> {
  return apiRequest({
    path: ENDPOINTS.merge(memoirId, loserId, winnerId),
    method: "POST",
    headers: await authHeaders(),
    schema: mergeResultSchema,
    ...options,
  });
}

/**
 * Kills the current share link and issues a replacement.
 *
 * Irreversible, and everyone holding the old URL loses access the moment it
 * returns — including people who were going to contribute this weekend.
 * Nothing already contributed is affected. The UI must say so before calling.
 */
export async function reissueLink(
  memoirId: string,
  options: RequestOptions = {},
): Promise<ShareLink> {
  return apiRequest({
    path: ENDPOINTS.reissue(memoirId),
    method: "POST",
    headers: await authHeaders(),
    schema: shareLinkSchema,
    ...options,
  });
}
