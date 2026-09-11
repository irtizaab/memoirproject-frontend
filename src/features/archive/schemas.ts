/**
 * The contract for memories — the twin of the backend's `Memory`,
 * `MemoryCreate` and `MemoryUpdate` in `src/models/memory_models.py`.
 *
 * Form validation rules live here too, not in the components. A component
 * renders whatever `react-hook-form` reports; it does not decide what counts
 * as valid.
 */

import { z } from "zod";

import { mediaAssetSchema } from "@/features/media";

/** Mirrors the `memory_kind` enum: how the memory was given. */
export const memoryKindSchema = z.enum(["text", "photo", "voice"]);

/** Mirrors `Memory`, the shape every memory endpoint returns. */
export const memorySchema = z.object({
  id: z.uuid(),
  memoir_id: z.uuid(),
  kind: memoryKindSchema,
  title: z.string().nullable(),
  body_text: z.string().nullable(),
  /** ISO date, or null when nobody was asked or nobody could say. */
  happened_on: z.string().nullable(),
  created_at: z.string(),
  contributor_name: z.string(),
  contributor_relationship: z.string(),
  /**
   * Which participant left it, and whether that is the owner.
   *
   * The id rather than the name is what groups one person's memories together
   * on the contributors screen — two people who share a name are two people,
   * and the whole merge flow exists because that is not a hypothetical.
   *
   * `is_owner` for the same reason: a contributor who happens to type the
   * owner's name is still a contributor.
   */
  participant_id: z.uuid(),
  is_owner: z.boolean(),
  assets: z.array(mediaAssetSchema),
});

/**
 * Mirrors `MemoryCreate`. What goes out when the composer is submitted.
 *
 * No `kind`. A memory holds writing, photographs and recordings in any
 * combination, so what it *is* is derived by the backend from what it holds —
 * see `_derive_kind` in the API's `memory_service.py`. `memorySchema` above
 * still carries it, because reading it back is when the answer is useful.
 */
export const memoryCreateSchema = z.object({
  title: z.string().nullable().optional(),
  body_text: z.string().nullable().optional(),
  happened_on: z.string().nullable().optional(),
  asset_ids: z.array(z.uuid()).optional(),
});

/**
 * The composer form.
 *
 * Note what is *not* required: a title. The contributor screen does not ask
 * for one at all, and an owner writing at speed should not be stopped by a
 * field they will fill in later.
 *
 * The one real rule is not expressible here, because it spans the form *and*
 * the attachments: a memory needs something in it — words, a photograph, or a
 * recording. That is checked at submit time in the composer, and again by the
 * backend (`EmptyMemory` -> 400) on top of the database's
 * `memory_text_has_body`.
 */
export const memoryFormSchema = z.object({
  title: z.string().max(200, "Keep the title under 200 characters.").optional(),
  body_text: z.string().optional(),
  happened_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 1988-08-12.")
    .optional()
    .or(z.literal("")),
});

export type MemoryKind = z.infer<typeof memoryKindSchema>;
export type Memory = z.infer<typeof memorySchema>;
export type MemoryCreate = z.infer<typeof memoryCreateSchema>;
export type MemoryFormValues = z.output<typeof memoryFormSchema>;

/* -------------------------------------------------------------------------
 * The book
 * -------------------------------------------------------------------------
 * What the owner does with the memoir as a whole rather than with one memory,
 * in the order they do it: plan it, read and correct the plan, assemble it,
 * seal it, and take a copy away.
 *
 * Planning is the step that reads the whole archive and decides what the book
 * is — chapters, their order, their titles, and where each photograph belongs.
 * It is a draft until it is assembled, which is the point of it being a
 * separate step at all: before this, the model's decisions about a family's
 * book existed only inside one request and nobody ever saw them.
 * ------------------------------------------------------------------------- */

/**
 * Which of the two assemblers organised the plan. Mirrors `PlanOrigin`.
 *
 * `planner` is the model reading the whole archive; `by_date` is the decade
 * fallback that runs when it cannot. Worth surfacing rather than hiding: the
 * two are indistinguishable once the book is written, and a deployment with no
 * model key produces `by_date` for every memoir without saying so.
 */
export const planOriginSchema = z.enum(["planner", "by_date"]);

/** Where a photograph sits. Mirrors `figure_placement`, including 0016's carousel. */
export const plannedPlacementSchema = z.enum(["margin", "inset", "carousel"]);

/** One memory a planned passage drew on. Mirrors `PlannedSource`. */
export const plannedSourceSchema = z.object({
  memory_id: z.uuid(),
  start_offset: z.number().int().nullable().default(null),
  end_offset: z.number().int().nullable().default(null),
  diverges: z.boolean().default(false),
});

/**
 * One passage in the plan, before it is a row. Mirrors `PlannedBlock`.
 *
 * `index` is the passage's position as the server stored it, and it is how an
 * edit says which passage it means — a passage has no id, because it is not a
 * row yet, and it cannot be matched by its text because the text is the thing
 * being edited. It is not the reading order: order is array position, so
 * moving a passage means sending it earlier carrying the same `index`.
 */
export const plannedBlockSchema = z.object({
  index: z.number().int().nullable().default(null),
  kind: z.enum(["paragraph", "pull"]),
  text: z.string(),
  sources: z.array(plannedSourceSchema).default([]),
});

/**
 * Where the model put one photograph. Mirrors `PlannedFigure`.
 *
 * Named by memory rather than by passage on purpose — the passages do not
 * exist as rows until the plan is assembled, and are different rows each run.
 */
export const plannedFigureSchema = z.object({
  asset_id: z.uuid(),
  anchor_memory_id: z.uuid(),
  placement: plannedPlacementSchema,
});

/**
 * One chapter of the plan. Mirrors `PlannedChapter`.
 *
 * `id` is minted when the plan is stored, and it belongs to this plan only —
 * planning again produces new chapters with new ids, because they are new
 * chapters. It is what a rename or a move names, so that neither operation
 * changes which chapter is being operated on.
 */
export const plannedChapterSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  from_year: z.number().int().nullable().default(null),
  through_year: z.number().int().nullable().default(null),
  blocks: z.array(plannedBlockSchema).default([]),
  figures: z.array(plannedFigureSchema).default([]),
  memory_ids: z.array(z.uuid()).default([]),
});

/**
 * The plan the owner reads before the book is written. Mirrors `MemoirPlan`.
 *
 * `assembled_at` is the difference between a draft they can still change and a
 * record of what the book was built from. `edited_at` is how the screen knows
 * whether regenerating would throw away an evening's work.
 */
export const memoirPlanSchema = z.object({
  organised_by: planOriginSchema,
  generated_at: z.string(),
  edited_at: z.string().nullable().default(null),
  assembled_at: z.string().nullable().default(null),
  chapters: z.array(plannedChapterSchema).default([]),
});

/**
 * What assembling produced. Mirrors the backend's `AssemblyResult`.
 *
 * Four counts and where the organisation came from — facts about what their
 * archive turned into, with no denominator. `figures` can honestly be lower
 * than the number of photographs: one in a chapter with no prose has no
 * paragraph to sit beside.
 */
export const assemblyResultSchema = z.object({
  chapters: z.number().int(),
  blocks: z.number().int(),
  sources: z.number().int(),
  figures: z.number().int(),
  organised_by: planOriginSchema,
});

/** What sealing gives back. Never the passphrase — see `publishFormSchema`. */
export const memoirPublicationSchema = z.object({
  view_token: z.string(),
  published_at: z.string(),
});

/**
 * The passphrase, on its way to being sealed in.
 *
 * Eight characters is the backend's floor, checked here so the message names
 * the field rather than arriving as a 422. There is no confirm field: the owner
 * can replace it afterwards, and asking somebody to type a passphrase twice is
 * a ceremony that catches typos the replace button already forgives.
 */
export const publishFormSchema = z.object({
  passphrase: z
    .string()
    .trim()
    .min(8, "Use at least eight characters — a short phrase is ideal.")
    .max(256, "Keep it under 256 characters."),
});

export type PlanOrigin = z.infer<typeof planOriginSchema>;
export type PlannedPlacement = z.infer<typeof plannedPlacementSchema>;
export type PlannedBlock = z.infer<typeof plannedBlockSchema>;
export type PlannedFigure = z.infer<typeof plannedFigureSchema>;
export type PlannedChapter = z.infer<typeof plannedChapterSchema>;
export type MemoirPlan = z.infer<typeof memoirPlanSchema>;
export type AssemblyResult = z.infer<typeof assemblyResultSchema>;
export type MemoirPublication = z.infer<typeof memoirPublicationSchema>;
export type PublishFormValues = z.output<typeof publishFormSchema>;
