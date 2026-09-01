/**
 * The account's calls to the backend.
 *
 * One endpoint today. It lives in its own file rather than inline in the hook
 * for the same reason every other feature does it: the hook owns caching, this
 * owns the wire.
 */

import { apiRequest, type ApiRequestCaching } from "@/lib/api/client";
import { authHeaders } from "@/lib/supabase/client";
import {
  accountOverviewSchema,
  type AccountOverview,
} from "@/features/account/schemas";

const ENDPOINTS = {
  me: "/me",
} as const;

type RequestOptions = ApiRequestCaching & { signal?: AbortSignal };

/**
 * The signed-in user and the memoirs they own.
 *
 * How every screen finds out which memoir it is looking at, and how the
 * dashboard survives a reload: the claim response is long gone, but this
 * returns the same memoir and share link.
 *
 * Returns an empty `memoirs` array — not a 404 — for someone who has signed up
 * but claimed nothing. That is an ordinary state on the way through
 * onboarding, and the screens treat it as one.
 */
export async function getMe(
  options: RequestOptions = {},
): Promise<AccountOverview> {
  return apiRequest({
    path: ENDPOINTS.me,
    method: "GET",
    headers: await authHeaders(),
    schema: accountOverviewSchema,
    // Never cached: it is per-user and changes the moment a draft is claimed.
    cache: "no-store",
    ...options,
  });
}
