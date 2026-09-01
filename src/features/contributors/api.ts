/**
 * The contributors screen's calls to the backend.
 */

import { apiRequest, type ApiRequestCaching } from "@/lib/api/client";
import { authHeaders } from "@/lib/supabase/client";
import {
  contributorsOverviewSchema,
  shareLinkSchema,
  type ContributorsOverview,
  type ShareLink,
} from "@/features/contributors/schemas";

const ENDPOINTS = {
  contributors: (memoirId: string) => `/memoirs/${memoirId}/contributors`,
  reissue: (memoirId: string) => `/memoirs/${memoirId}/link/reissue`,
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
