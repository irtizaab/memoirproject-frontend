/**
 * The feature's calls to the backend.
 *
 * This is the only file that knows these endpoint paths exist. No `fetch`, no
 * base URL, no error handling — that belongs to `lib/api/client.ts`, the same
 * way backend domain code calls into `integrations/` rather than talking to a
 * driver directly.
 *
 * Two kinds of credential appear below, and they are not interchangeable:
 *
 *   X-Draft-Token   proves this browser started the draft. Pre-signup, it is
 *                   the only credential in existence.
 *   Authorization   proves who the user is, once they have an account.
 *
 * `POST /memoirs/claim` needs BOTH, because it is the moment the two are
 * joined: without the draft token, any signed-in user who learned a draft id
 * could claim someone else's answers.
 */

import { apiRequest, type ApiRequestCaching } from "@/lib/api/client";
import { authHeaders } from "@/lib/supabase/client";
import {
  memoirSummarySchema,
  type MemoirSummary,
} from "@/features/account/schemas";
import {
  draftCreatedSchema,
  draftSchema,
  draftUpdateSchema,
  type Draft,
  type DraftCreated,
  type DraftUpdate,
} from "@/features/onboarding/schemas";

const ENDPOINTS = {
  drafts: "/drafts",
  draft: (id: string) => `/drafts/${id}`,
  claim: "/memoirs/claim",
} as const;

type RequestOptions = ApiRequestCaching & { signal?: AbortSignal };

/**
 * Starts a new anonymous draft.
 *
 * Called the moment onboarding begins, before the user has typed anything —
 * every column is left at its database default, and Postgres generates both
 * the id and the secret token.
 */
export async function createDraft(
  options: RequestOptions = {},
): Promise<DraftCreated> {
  return apiRequest({
    path: ENDPOINTS.drafts,
    method: "POST",
    schema: draftCreatedSchema,
    ...options,
  });
}

/**
 * Saves one or more onboarding answers onto an existing draft.
 *
 * Validated on the way out as well as the way in: a malformed patch caught
 * here produces a clear message at the call site instead of a 422 round-trip.
 */
export async function updateDraft(
  draftId: string,
  token: string,
  patch: DraftUpdate,
  options: RequestOptions = {},
): Promise<Draft> {
  const body = draftUpdateSchema.parse(patch);

  return apiRequest({
    path: ENDPOINTS.draft(draftId),
    method: "PATCH",
    body,
    headers: { "X-Draft-Token": token },
    schema: draftSchema,
    ...options,
  });
}

/**
 * Turns the finished draft into a real memoir owned by the signed-in user.
 *
 * The hinge of the whole flow. On the backend this is a single transaction
 * writing four rows — account, memoir, owner participant, share link — so it
 * either fully succeeds or leaves nothing behind.
 */
export async function claimDraft(
  draftId: string,
  token: string,
  options: RequestOptions = {},
): Promise<MemoirSummary> {
  return apiRequest({
    path: ENDPOINTS.claim,
    method: "POST",
    body: { draft_id: draftId },
    headers: {
      "X-Draft-Token": token,
      ...(await authHeaders()),
    },
    schema: memoirSummarySchema,
    ...options,
  });
}
