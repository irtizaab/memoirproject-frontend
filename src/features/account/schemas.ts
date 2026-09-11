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

  /**
   * How many chapters the archive has been assembled into, and therefore the
   * answer to "is there a book yet". The dashboard shows nothing that opens
   * the reader until this is above zero, because a memoir with no chapters
   * opens onto an empty page.
   */
  chapter_count: z.number().int().default(0),

  /** When it was sealed, or null while it is still a draft. */
  published_at: z.string().nullable().default(null),

  /**
   * The token that opens the reader — distinct from `link_token` above, which
   * collects memories. Null until publication issues it.
   */
  view_token: z.string().nullable().default(null),
});

/** Mirrors `AccountOverview` — the body of `GET /me`. */
export const accountOverviewSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  full_name: z.string(),
  memoirs: z.array(memoirSummarySchema),
});

/**
 * The sign-in form.
 *
 * Here rather than in `onboarding/` — which has a near-identical
 * `signupFormSchema` — because signing in is what somebody with an account
 * does, and this is the account feature. Importing a finished flow's schema
 * to log in would make `/signin` depend on onboarding forever.
 *
 * The rules are deliberately weaker than the signup form's: an existing
 * password is whatever Supabase already accepted, and re-asserting a minimum
 * length here would refuse a valid one locally and never send the request.
 */
export const signInFormSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export type MemoirSummary = z.infer<typeof memoirSummarySchema>;
export type AccountOverview = z.infer<typeof accountOverviewSchema>;
export type SignInFormValues = z.output<typeof signInFormSchema>;
