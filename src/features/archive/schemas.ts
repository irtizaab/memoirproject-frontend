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
 * Three requests the owner makes about the memoir as a whole rather than about
 * one memory: assemble it, seal it, and take a copy away.
 * ------------------------------------------------------------------------- */

/**
 * What assembling produced. Mirrors the backend's `AssemblyResult`.
 *
 * Four counts and nothing else — facts about what their archive turned into,
 * with no denominator. `figures` can honestly be lower than the number of
 * photographs: one in a chapter with no prose has no paragraph to sit beside.
 */
export const assemblyResultSchema = z.object({
  chapters: z.number().int(),
  blocks: z.number().int(),
  sources: z.number().int(),
  figures: z.number().int(),
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

export type AssemblyResult = z.infer<typeof assemblyResultSchema>;
export type MemoirPublication = z.infer<typeof memoirPublicationSchema>;
export type PublishFormValues = z.output<typeof publishFormSchema>;
