/**
 * The contract for the signed-in account — the twin of the backend's
 * `AccountOverview` and `MemoirSummary` in `src/models/memoir_models.py`.
 *
 * Its own feature rather than part of `onboarding/` because every signed-in
 * screen needs it. Onboarding is where an account is *created*; the archive,
 * the contributors list and the billing page all read it long afterwards, and
 * none of them should have to import from a flow their user finished weeks
 * ago.
 */

import { z } from "zod";

/** Mirrors `MemoirSummary`. One memoir, as its owner sees it listed. */
export const memoirSummarySchema = z.object({
  id: z.uuid(),
  subject_name: z.string(),
  born_year: z.number().int().nullable(),
  through_year: z.number().int().nullable(),
  subject_is_living: z.boolean().nullable(),
  /** The owner's private answer. Never sent to the contributor endpoint. */
  never_forget: z.string().nullable(),
  status: z.string(),
  created_at: z.string(),
  /** Null when the share link has been revoked and not yet reissued. */
  link_token: z.string().nullable(),
});

/** Mirrors `AccountOverview` — the body of `GET /me`. */
export const accountOverviewSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  full_name: z.string(),
  memoirs: z.array(memoirSummarySchema),
});

export type MemoirSummary = z.infer<typeof memoirSummarySchema>;
export type AccountOverview = z.infer<typeof accountOverviewSchema>;
