/**
 * The contract for the `onboarding` feature — the direct twin of the backend's
 * `src/models/draft_models.py` and `src/models/memoir_models.py`.
 *
 * When a Pydantic model on the backend changes, this file changes. Nothing
 * else in the feature should need to know the field names.
 *
 * These schemas are what turn a backend change into a loud, specific error
 * instead of `undefined` appearing three components deep: `lib/api/client.ts`
 * parses every response through them and throws an `ApiError` with code
 * `"contract"` naming the offending field.
 */

import { z } from "zod";

// The account shapes live in `features/account/`, because every signed-in
// screen reads them and none of those screens should import from a flow the
// user finished at signup. Re-exported here so `claimDraft` — which returns a
// MemoirSummary — keeps its contract in one import.
export {
  accountOverviewSchema,
  memoirSummarySchema,
} from "@/features/account/schemas";
export type {
  AccountOverview,
  MemoirSummary,
} from "@/features/account/schemas";

/**
 * Mirrors the `relationship_group` Postgres enum.
 *
 * The database is the guarantee — this is the good error message. Keeping the
 * list here means a bad value is caught before the request leaves the browser,
 * rather than coming back as a generic 400 from Postgres.
 *
 * `self` exists in the enum but has no chip in the UI, so it is not offered
 * here either. `other` is what the "in your own words" field selects.
 */
export const relationshipGroupSchema = z.enum([
  "child",
  "grandchild",
  "spouse_partner",
  "friend",
  "self",
  "other",
]);

/** Mirrors what `POST /drafts` returns. */
export const draftCreatedSchema = z.object({
  id: z.uuid(),
  /**
   * The secret that proves this browser owns the draft. There is no logged-in
   * user yet, so this token is the *only* credential — it goes back on every
   * update as the `X-Draft-Token` header.
   */
  token: z.string().min(1),
});

/**
 * Mirrors `DraftUpdate`. Every field optional: this is a partial update, sent
 * one answer at a time as the user moves through the questions.
 *
 * `.nullable()` and optional mean different things here and both are used
 * deliberately. Omitted = "don't touch this column". Explicit `null` = "clear
 * it". Clearing matters for `through_year` when the user picks "Present".
 */
export const draftUpdateSchema = z.object({
  subject_name: z.string().trim().min(1).optional(),
  relationship: relationshipGroupSchema.optional(),
  relationship_label: z.string().nullable().optional(),
  born_year: z.number().int().nullable().optional(),
  through_year: z.number().int().nullable().optional(),
  subject_is_living: z.boolean().nullable().optional(),
  never_forget: z.string().nullable().optional(),
});

/** Mirrors what `PATCH /drafts/{id}` returns — the whole row, post-update. */
export const draftSchema = z.object({
  id: z.uuid(),
  subject_name: z.string().nullable(),
  relationship: relationshipGroupSchema.nullable(),
  relationship_label: z.string().nullable(),
  born_year: z.number().int().nullable(),
  through_year: z.number().int().nullable(),
  subject_is_living: z.boolean().nullable(),
  never_forget: z.string().nullable(),
});

/** Mirrors `MemoirSummary`. */
/**
 * The signup form.
 *
 * Validation rules and their messages live here, not in the component — the
 * component renders whatever `react-hook-form` reports. Password length
 * matches Supabase's own minimum so the user is told before the round trip.
 */
export const signupFormSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(6, "Use at least 6 characters."),
});

export type RelationshipGroup = z.infer<typeof relationshipGroupSchema>;
export type DraftCreated = z.infer<typeof draftCreatedSchema>;
export type DraftUpdate = z.infer<typeof draftUpdateSchema>;
export type Draft = z.infer<typeof draftSchema>;
export type SignupFormValues = z.output<typeof signupFormSchema>;

/**
 * The flow's own UI state, persisted only across the Google OAuth redirect.
 *
 * Parsed rather than cast because localStorage is untrusted input, same as an
 * API response: a half-written or hand-edited value must read as "no answers"
 * instead of putting `undefined` into a form field.
 */
export const onboardingStateSchema = z.object({
  name: z.string(),
  rel: z.string().nullable(),
  relLabel: z.string(),
  deep: z.string(),
  born: z.string(),
  bornSet: z.boolean(),
  through: z.string(),
  throughSet: z.boolean(),
  term: z.enum(["month", "year"]),
});
