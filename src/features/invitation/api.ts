/**
 * The feature's calls to the backend.
 *
 * One endpoint, and it is the only unauthenticated one in the whole API. The
 * token in the path is the entire credential — there is no account to check it
 * against, which is why the backend generates 24 random bytes for it.
 */

import { apiRequest, type ApiRequestCaching } from "@/lib/api/client";
import {
  contributedMemorySchema,
  contributionReceiptSchema,
  contributionSchema,
  invitationSchema,
  type ContributedMemory,
  type Contribution,
  type ContributionReceipt,
  type Invitation,
} from "@/features/invitation/schemas";

const ENDPOINTS = {
  invitation: (token: string) => `/j/${encodeURIComponent(token)}`,
  memories: (token: string) => `/j/${encodeURIComponent(token)}/memories`,
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

/**
 * Leaves a memory through the share link.
 *
 * No authorization header anywhere in this call: the token in the path is the
 * whole credential, and the contributor has nothing else. The response carries
 * a `participant_token` — keep it, and they are recognised as the same person
 * next time rather than appearing in the archive twice.
 *
 * 404 covers unknown, revoked, view-only, and "the memoir has been published".
 * A contributor cannot act on the difference between those, and spelling it
 * out would tell whoever holds a dead link why it died.
 */
export async function submitContribution(
  token: string,
  contribution: Contribution,
  options: ApiRequestCaching & { signal?: AbortSignal } = {},
): Promise<ContributionReceipt> {
  const body = contributionSchema.parse(contribution);

  return apiRequest({
    path: ENDPOINTS.memories(token),
    method: "POST",
    body,
    schema: contributionReceiptSchema,
    ...options,
  });
}

/**
 * What this one contributor has added.
 *
 * Scoped by their participant token, so it returns their own memories and
 * nothing else. A contributor must never see the archive or anyone else's
 * contributions — the backend's WHERE clause is where that promise is kept,
 * and this endpoint is the only window they have.
 */
export async function listMyContributions(
  token: string,
  participantToken: string,
  options: ApiRequestCaching & { signal?: AbortSignal } = {},
): Promise<ContributedMemory[]> {
  return apiRequest({
    path: ENDPOINTS.memories(token),
    method: "GET",
    headers: { "X-Participant-Token": participantToken },
    schema: contributedMemorySchema.array(),
    cache: "no-store",
    ...options,
  });
}
