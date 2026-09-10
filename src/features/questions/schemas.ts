/**
 * The contract for the `questions` feature — the twin of the backend's
 * `src/models/prompt_models.py`.
 *
 * This is the owner's side of the library. The contributor's side lives in
 * `features/invitation/schemas.ts` and is deliberately much thinner: it has no
 * ids, no `source`, no mode, and no `subject_notes`. The gap between the two
 * files is the privacy boundary, and it is easier to see when they are apart.
 */

import { z } from "zod";

/** The `relationship_group` enum from the backend's migration 0001. */
export const relationshipGroupSchema = z.enum([
  "child",
  "grandchild",
  "spouse_partner",
  "friend",
  "self",
  "other",
]);

/**
 * Where a question came from. The `prompt_source` enum from migration 0014.
 *
 * `owner` is the load-bearing value: a question becomes `owner` the moment it
 * is edited by hand, and that is what makes it survive a rewrite. The screen
 * shows it so the owner can see which of their questions are protected.
 */
export const promptSourceSchema = z.enum(["ai", "standard", "owner"]);

/**
 * Which set contributors actually see. The `questions_mode` enum.
 *
 * Two values rather than a boolean, because neither is "off". Both are a real
 * answer to "what should my family be asked", and the screen presents them as
 * a choice between two things rather than as a switch.
 */
export const questionsModeSchema = z.enum(["standard", "custom"]);

export const questionSchema = z.object({
  id: z.uuid(),
  relationship: relationshipGroupSchema,
  ordinal: z.number().int(),
  body: z.string(),
  source: promptSourceSchema,
  updated_at: z.string(),
});

export const questionGroupSchema = z.object({
  relationship: relationshipGroupSchema,
  questions: z.array(questionSchema),
});

/**
 * The shipped questions. Strings, not rows.
 *
 * A separate shape from `questionGroupSchema` on purpose — these come from a
 * constant in the backend, so they have no id to edit by and nothing that
 * could have edited them.
 */
export const standardGroupSchema = z.object({
  relationship: relationshipGroupSchema,
  questions: z.array(z.string()),
});

/** The whole screen in one response. */
export const questionLibrarySchema = z.object({
  memoir_id: z.uuid(),
  subject_name: z.string(),
  mode: questionsModeSchema,
  /** What the owner last said about the subject, so a rewrite need not re-ask. */
  subject_notes: z.string().nullable(),
  groups: z.array(questionGroupSchema),
  standard: z.array(standardGroupSchema),
});

export type RelationshipGroup = z.infer<typeof relationshipGroupSchema>;
export type PromptSource = z.infer<typeof promptSourceSchema>;
export type QuestionsMode = z.infer<typeof questionsModeSchema>;
export type Question = z.infer<typeof questionSchema>;
export type QuestionGroup = z.infer<typeof questionGroupSchema>;
export type StandardGroup = z.infer<typeof standardGroupSchema>;
export type QuestionLibrary = z.infer<typeof questionLibrarySchema>;

/**
 * What each relationship group is called on screen.
 *
 * Phrased as the people, not as the enum: the owner is looking at "Their
 * grandchildren", not at `grandchild`. Deliberately not reusing onboarding's
 * `RELATIONS`, which is phrased from the owner's own side ("My grandparent")
 * and would read as nonsense as a section heading here.
 */
export const GROUP_LABELS: Record<RelationshipGroup, string> = {
  child: "Their children",
  grandchild: "Their grandchildren",
  spouse_partner: "Their partner",
  friend: "Their friends",
  self: "Themselves",
  other: "Everyone else",
};

/**
 * The order the screen shows them in, closest relationship first.
 *
 * `self` is deliberately absent. It means the subject writing their own
 * memoir, and nobody arriving through a share link is doing that — the
 * contributor form has never offered it either. It stays in the enum because
 * the column still has it and a response carrying it must still parse; it is
 * only not a section the owner is shown or asked to write questions for.
 */
export const GROUP_ORDER: RelationshipGroup[] = [
  "child",
  "grandchild",
  "spouse_partner",
  "friend",
  "other",
];
