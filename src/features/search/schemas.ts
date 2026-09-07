/**
 * The contract for searching a memoir — the twin of the backend's
 * `SearchHit` and `SearchResults` in `src/models/chapter_models.py`.
 *
 * One feature rather than two, because the owner searching from the archive
 * and a family member searching from the reader ask the same question of the
 * same corpus and get the same answer. They differ only in which credential
 * they hold, which is `api.ts`'s business and nothing else's.
 */

import { z } from "zod";

/**
 * Where a hit was found. Four places, because that is every place a memoir
 * keeps words: the book, the captions, the recordings, and the margins.
 */
export const searchKindSchema = z.enum([
  "chapter",
  "photo",
  "recording",
  "reflection",
]);

export const searchHitSchema = z.object({
  kind: searchKindSchema,
  /** The block, memory or comment that matched. */
  id: z.uuid(),
  /**
   * Where to go when it is clicked. Null on a photograph or a recording that
   * is not in a chapter — those live in the archive rather than in the book.
   */
  chapter_id: z.uuid().nullable(),
  title: z.string(),
  year: z.number().int().nullable(),
  /**
   * The matching words in context, with each match wrapped in two control
   * characters. Not HTML: this is built from text a reader typed, and marking
   * it up server-side would mean rendering user input as markup. Split it with
   * `highlight()` in `utils.ts`.
   */
  excerpt: z.string(),
  /** Who wrote or gave it. Null on a chapter paragraph, which has many. */
  attribution: z.string().nullable(),
});

export const searchResultsSchema = z.object({
  query: z.string(),
  total: z.number().int(),
  /**
   * How many of each kind. From the same rows as `hits`, so a filter can never
   * say 1 and show 0.
   */
  counts: z.record(z.string(), z.number().int()),
  hits: z.array(searchHitSchema),
});

export type SearchKind = z.infer<typeof searchKindSchema>;
export type SearchHit = z.infer<typeof searchHitSchema>;
export type SearchResults = z.infer<typeof searchResultsSchema>;
