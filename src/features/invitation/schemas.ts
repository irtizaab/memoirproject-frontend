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

import { mediaAssetSchema } from "@/features/media";

/**
 * The `relationship_group` enum from the backend's migration 0001.
 *
 * `self` is deliberately absent from what the contribute form offers: it means
 * the subject writing their own memoir, which is not a thing somebody arriving
 * through a share link is doing.
 */
export const relationshipGroupSchema = z.enum([
  "child",
  "grandchild",
  "spouse_partner",
  "friend",
  "self",
  "other",
]);

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

/**
 * One memory, as the contributor sees their own.
 *
 * The same shape the owner's archive uses — deliberately, since it is the same
 * row. What differs is which rows a contributor may ask for: only their own.
 */
export const contributedMemorySchema = z.object({
  id: z.uuid(),
  memoir_id: z.uuid(),
  kind: z.enum(["text", "photo", "voice"]),
  title: z.string().nullable(),
  body_text: z.string().nullable(),
  happened_on: z.string().nullable(),
  created_at: z.string(),
  contributor_name: z.string(),
  contributor_relationship: z.string(),
  assets: z.array(mediaAssetSchema),
});

export type Invitation = z.infer<typeof invitationSchema>;

/**
 * The contributor's own submission — the twin of the backend's
 * `ContributedMemory`.
 *
 * `display_name` is required, because there is no account to look a name up
 * from. That is the product working as designed, not a shortcut: contributors
 * never create accounts, so the only way to know who left something is to ask.
 */
export const contributionSchema = z.object({
  /*
    No `kind`. A contribution may hold writing, photographs and recordings all
    at once, so what it *is* is derived by the backend from what it holds
    rather than declared here. See `_derive_kind` in the API's
    `memory_service.py`. The response schema above still carries `kind`,
    because reading it back is exactly when the answer is useful.
  */
  title: z.string().max(200).nullable().optional(),
  body_text: z.string().nullable().optional(),
  happened_on: z.string().nullable().optional(),
  asset_ids: z.array(z.uuid()).optional(),
  display_name: z.string().min(1).max(120),
  /*
    How they knew the subject. Optional, and omitting it leaves whatever is
    already stored rather than resetting them to "other".

    Two things read it: the reader prints it under their name in a credit line,
    and the question library picks what they are asked from the group they are
    in. Until the form started asking, every contributor in every memoir was
    stored as `other`.
  */
  relationship: relationshipGroupSchema.optional(),
  /** Sent on every visit after the first, so they stay the same person. */
  participant_token: z.string().nullable().optional(),
});

/**
 * Mirrors `ContributionReceipt`.
 *
 * The only response in the whole API that hands out a credential, and it goes
 * to someone who by design has no other one.
 */
export const contributionReceiptSchema = z.object({
  memory: contributedMemorySchema,
  participant_token: z.string(),
});

/**
 * The contributor form.
 *
 * Rules live here, not in the component. No title field: the contributor
 * screen does not ask for one, because a person who was sent a link by a
 * grieving relative should face as few boxes as possible.
 */
export const contributionFormSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Please add your name, so the family knows who this is from.")
    .max(120, "That name is too long."),
  body_text: z.string().optional(),
});

export type Contribution = z.infer<typeof contributionSchema>;
export type ContributionReceipt = z.infer<typeof contributionReceiptSchema>;
export type ContributedMemory = z.infer<typeof contributedMemorySchema>;
export type ContributionFormValues = z.output<typeof contributionFormSchema>;

/**
 * The questions this contributor is asked — the twin of the backend's
 * `ContributorQuestions`.
 *
 * Strings, and the group they were written for. Note what the backend refuses
 * to send and this schema therefore does not ask for: no ids for rows a
 * contributor cannot edit, no `source` saying which questions a model drafted,
 * and above all not the owner's private notes about the subject.
 */
export const questionsSchema = z.object({
  relationship: relationshipGroupSchema,
  questions: z.array(z.string()),
});

export type RelationshipGroup = z.infer<typeof relationshipGroupSchema>;
export type ContributorQuestions = z.infer<typeof questionsSchema>;
