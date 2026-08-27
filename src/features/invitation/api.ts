/**
 * The feature's calls to the backend.
 *
 * One endpoint, and it is the only unauthenticated one in the whole API. The
 * token in the path is the entire credential — there is no account to check it
 * against, which is why the backend generates 24 random bytes for it.
 */

import { apiRequest, type ApiRequestCaching } from "@/lib/api/client";
import {
  invitationSchema,
  type Invitation,
} from "@/features/invitation/schemas";

const ENDPOINTS = {
  invitation: (token: string) => `/j/${encodeURIComponent(token)}`,
} as const;

/**
 * Resolves a share token into the memoir it points at.
 *
 * Throws an `ApiError` with status 404 when the token is unknown OR revoked —
 * the backend deliberately does not distinguish them, so a killed link looks
 * exactly like one that never existed.
 */
export async function getInvitation(
  token: string,
  options: ApiRequestCaching & { signal?: AbortSignal } = {},
): Promise<Invitation> {
  return apiRequest({
    path: ENDPOINTS.invitation(token),
    method: "GET",
    schema: invitationSchema,
    ...options,
  });
}
