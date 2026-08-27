/**
 * The contract for the `invitation` feature — the twin of the backend's
 * `LinkInvitation` in `src/models/memoir_models.py`.
 *
 * Its own feature rather than part of `onboarding/` because the actor is a
 * different person with different rights: a contributor who has no account and
 * never will. The backend draws the same line, keeping `domain/links/` apart
 * from `domain/memoirs/`.
 */

import { z } from "zod";

/**
 * Mirrors `LinkInvitation`.
 *
 * Note what is absent: `never_forget`. It is the owner's private answer, and
 * the backend's `response_model` filters it out before this endpoint replies.
 * This schema not asking for it is the second half of that guarantee.
 */
export const invitationSchema = z.object({
  memoir_id: z.uuid(),
  subject_name: z.string(),
  born_year: z.number().int().nullable(),
  through_year: z.number().int().nullable(),
  subject_is_living: z.boolean().nullable(),
  /** `contribute` or `view` — the `link_scope` enum. */
  scope: z.string(),
  /** Display name of the memoir's owner, so the link is recognisably from someone. */
  invited_by: z.string(),
});

export type Invitation = z.infer<typeof invitationSchema>;
