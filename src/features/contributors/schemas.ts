/**
 * The contract for the contributors screen — the twin of the backend's
 * `ContributorsOverview`, `Contributor` and `ShareLink` in
 * `src/models/account_models.py`.
 */

import { z } from "zod";

/**
 * Mirrors `ShareLink`.
 *
 * A token, not a URL. The backend has no business knowing what domain the
 * frontend is served from — a staging deploy that handed out production links
 * would be a real bug — so the frontend composes the address.
 */
export const shareLinkSchema = z.object({
  token: z.string(),
  /** A plain fact about how often it was opened. Not a score, never a target. */
  open_count: z.number().int(),
  created_at: z.string(),
});

/**
 * Mirrors `Contributor`.
 *
 * Note what is absent: `contributor_token`. It is that person's credential for
 * adding memories, and an owner holding it could only use it to impersonate
 * them. The backend's `response_model` filters it out; this schema not asking
 * for it is the second half of that guarantee.
 */
export const contributorSchema = z.object({
  id: z.uuid(),
  display_name: z.string(),
  role: z.string(),
  relationship: z.string(),
  relationship_label: z.string().nullable(),
  /** Null means they have never opened the link at all. */
  first_opened_at: z.string().nullable(),
  memory_count: z.number().int(),
  last_contribution_at: z.string().nullable(),
});

export const contributorsOverviewSchema = z.object({
  /** Null when every link has been revoked and none reissued yet. */
  link: shareLinkSchema.nullable(),
  participants: z.array(contributorSchema),
});

/**
 * What merging two entries did.
 *
 * `memories_moved` is reported so the confirmation can state the real number
 * rather than a hopeful one — "4 memories moved" reads very differently from
 * silence when the owner expected four.
 */
export const mergeResultSchema = z.object({
  participant_id: z.uuid(),
  memories_moved: z.number().int(),
});

export type ShareLink = z.infer<typeof shareLinkSchema>;
export type Contributor = z.infer<typeof contributorSchema>;
export type ContributorsOverview = z.infer<typeof contributorsOverviewSchema>;
export type MergeResult = z.infer<typeof mergeResultSchema>;
