/**
 * The contract for the finished memoir — the twin of the backend's
 * `Chapter`, `MemoirReading` and `CommentCreate` in `src/models/chapter_models.py`.
 *
 * The shape worth understanding before anything else is `BlockSource`. A
 * chapter is not written by anybody; it is assembled and rephrased from many
 * people's memories, so every clause carries the memory it came from and the
 * person who left it. `start_offset` / `end_offset` are character offsets into
 * the block's own text, half-open, and both null means the whole block.
 *
 * Those offsets are safe to store and safe to trust because a published memoir
 * is immutable — the text never moves under them. If anything ever makes a
 * published chapter editable, every anchor in this file needs rebasing.
 */

import { z } from "zod";

/**
 * How a memory was given — the same three values as the archive's
 * `memoryKindSchema`, and the same backend enum underneath.
 *
 * Declared again here rather than imported, because `features/archive` is the
 * owner's side of the product and this is the reader's; a dependency between
 * them for three strings would be the only thing joining two features that
 * otherwise share nothing.
 */
export const sourceMediumSchema = z.enum(["text", "photo", "voice"]);

/** Mirrors the `block_kind` enum: what a block *is*. */
export const blockKindSchema = z.enum(["paragraph", "pull", "figure"]);

/** Mirrors `figure_placement`. Chosen by assembly, never by a reader. */
export const figurePlacementSchema = z.enum(["margin", "inset"]);

/** One person's memory, and which words of the paragraph came from it. */
export const blockSourceSchema = z.object({
  id: z.uuid(),
  memory_id: z.uuid(),
  participant_id: z.uuid(),
  name: z.string(),
  relationship: z.string(),
  medium: sourceMediumSchema,
  /** The year the credit line prints. Null when nothing could be dated. */
  year: z.number().int().nullable(),
  /** The longest recording on that memory, so a voice credit reads "0:47". */
  duration_ms: z.number().int().nullable(),
  start_offset: z.number().int().nullable(),
  end_offset: z.number().int().nullable(),
  /**
   * This source contradicts the prose and was kept anyway. The product rule it
   * serves — "divergent accounts are both kept and shown side by side" — is why
   * the reader prints the word "differs" beside the credit rather than hiding
   * one of the two.
   */
  diverges: z.boolean(),
});

/**
 * A photograph on the page.
 *
 * `url` is freshly signed and expiring, exactly like `MediaAsset.url`. The
 * caption is the contributor's own words about their own photograph, read from
 * the memory it came from — never written by the assembly step.
 */
export const figureSchema = z.object({
  asset_id: z.uuid(),
  url: z.string().nullable(),
  placement: figurePlacementSchema,
  /** The paragraph this belongs beside. A margin plate is positioned by it. */
  anchor_block_id: z.uuid(),
  caption: z.string().nullable(),
  credit: z.string().nullable(),
  credit_participant_id: z.uuid().nullable(),
  year: z.number().int().nullable(),
});

/** One paragraph, one pulled line, or one photograph. */
export const blockSchema = z.object({
  id: z.uuid(),
  ordinal: z.number().int(),
  kind: blockKindSchema,
  text: z.string().nullable().default(null),
  figure: figureSchema.nullable().default(null),
  sources: z.array(blockSourceSchema).default([]),
});

/** One thing one person said about a passage. */
export const commentSchema = z.object({
  id: z.uuid(),
  participant_id: z.uuid(),
  name: z.string(),
  relationship: z.string(),
  body: z.string(),
  created_at: z.string(),
  is_owner: z.boolean(),
});

/**
 * A conversation about one passage, oldest first.
 *
 * Anchored the same way a source is, so the reader positions both with one
 * piece of arithmetic. Null offsets mean the whole paragraph.
 */
export const commentThreadSchema = z.object({
  id: z.uuid(),
  chapter_id: z.uuid(),
  block_id: z.uuid(),
  start_offset: z.number().int().nullable(),
  end_offset: z.number().int().nullable(),
  resolved_at: z.string().nullable(),
  comments: z.array(commentSchema).default([]),
});

/** One line of the contents rail. */
export const chapterSummarySchema = z.object({
  id: z.uuid(),
  ordinal: z.number().int(),
  title: z.string(),
  from_year: z.number().int().nullable(),
  through_year: z.number().int().nullable(),
});

/** One chapter in full. */
export const chapterSchema = z.object({
  id: z.uuid(),
  memoir_id: z.uuid(),
  ordinal: z.number().int(),
  title: z.string(),
  from_year: z.number().int().nullable(),
  through_year: z.number().int().nullable(),
  blocks: z.array(blockSchema).default([]),
  threads: z.array(commentThreadSchema).default([]),
  /** Everyone whose memories went into it, most-cited first. */
  told_by: z.array(z.string()).default([]),
  memory_count: z.number().int(),
});

/** One row of the back matter's index of people. */
export const readerPersonSchema = z.object({
  participant_id: z.uuid(),
  name: z.string(),
  relationship: z.string(),
  memory_count: z.number().int(),
});

/**
 * The colophon's four numbers.
 *
 * Facts about what the book is made of. Not a completion measure — there is no
 * denominator here and there must never be one.
 */
export const readerTotalsSchema = z.object({
  memories: z.number().int(),
  people: z.number().int(),
  chapters: z.number().int(),
  recordings: z.number().int(),
});

/**
 * The book's covers: who it is about, its contents, and its colophon.
 *
 * Note what is absent: `never_forget`. It is the owner's private answer, the
 * backend's `response_model` filters it out of every link-addressed response,
 * and nothing in the reader should go looking for it.
 */
export const memoirReadingSchema = z.object({
  memoir_id: z.uuid(),
  subject_name: z.string(),
  born_year: z.number().int().nullable(),
  through_year: z.number().int().nullable(),
  subject_is_living: z.boolean().nullable(),
  /** Null while the memoir is still a draft. The reader says which it is. */
  published_at: z.string().nullable(),
  chapters: z.array(chapterSummarySchema).default([]),
  people: z.array(readerPersonSchema).default([]),
  totals: readerTotalsSchema,
});

/**
 * A comment going out.
 *
 * Exactly one of `block_id` (start a thread) or `thread_id` (reply), which the
 * backend's `CommentCreate` validator enforces and the composer respects. The
 * rules live here rather than in a component, as every other form's do.
 */
export const commentCreateSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1, "Write something first.")
      .max(4000, "Keep a comment under 4000 characters."),
    block_id: z.uuid().optional(),
    start_offset: z.number().int().min(0).optional(),
    end_offset: z.number().int().positive().optional(),
    thread_id: z.uuid().optional(),
    display_name: z
      .string()
      .trim()
      .min(1, "Say who this is from.")
      .max(120, "Keep the name under 120 characters.")
      .optional(),
    participant_token: z.string().optional(),
  })
  .refine((value) => Boolean(value.block_id) !== Boolean(value.thread_id), {
    message: "A comment is about a passage or a reply to one, never both.",
  });

/** The composer form: what a reader types, and their name. */
export const commentFormSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(4000, "Keep a comment under 4000 characters."),
  display_name: z
    .string()
    .trim()
    .min(1, "Say who this is from.")
    .max(120, "Keep the name under 120 characters."),
});

/**
 * What comes back after commenting: the thread, and the token that makes this
 * person the same person next time.
 *
 * `participant_token` is null for the owner, who has a real account and must
 * not be handed a second, weaker credential.
 */
export const commentReceiptSchema = z.object({
  thread: commentThreadSchema,
  participant_token: z.string().nullable(),
});

export type SourceMedium = z.infer<typeof sourceMediumSchema>;
export type BlockKind = z.infer<typeof blockKindSchema>;
export type FigurePlacement = z.infer<typeof figurePlacementSchema>;
export type BlockSource = z.infer<typeof blockSourceSchema>;
export type Figure = z.infer<typeof figureSchema>;
export type Block = z.infer<typeof blockSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type CommentThread = z.infer<typeof commentThreadSchema>;
export type ChapterSummary = z.infer<typeof chapterSummarySchema>;
export type Chapter = z.infer<typeof chapterSchema>;
export type ReaderPerson = z.infer<typeof readerPersonSchema>;
export type ReaderTotals = z.infer<typeof readerTotalsSchema>;
export type MemoirReading = z.infer<typeof memoirReadingSchema>;
export type CommentCreate = z.infer<typeof commentCreateSchema>;
export type CommentFormValues = z.output<typeof commentFormSchema>;
export type CommentReceipt = z.infer<typeof commentReceiptSchema>;
