/**
 * The feature's public surface, client-safe.
 *
 * Deliberately not exported: `api.ts`, `useLanes.ts` and the reader's inner
 * components. Callers compose the two screens — `BookCover` for the front and
 * back matter, `ChapterReader` for a chapter — inside `ReaderFrame`, which is
 * what keeps the four-column geometry and the "the prose never moves" rule in
 * one place.
 *
 * `server.ts` sits beside this for the data path: a view link needs no
 * credential, so the book is fetched on the server.
 */

export { BookCover } from "@/features/memoir/components/BookCover";
export { ChapterReader } from "@/features/memoir/components/ChapterReader";
export { MemoirGate } from "@/features/memoir/components/MemoirGate";
export { ReaderFrame } from "@/features/memoir/components/ReaderFrame";
export {
  memoirKeys,
  useLeaveComment,
  useThreads,
} from "@/features/memoir/hooks";
export type {
  Block,
  ReaderSession,
  BlockSource,
  Chapter,
  ChapterSummary,
  CommentThread,
  Figure,
  MemoirReading,
} from "@/features/memoir/schemas";
export {
  chapterYears,
  credit,
  duration,
  lifespan,
  relationshipLabel,
  roman,
  segment,
  toldBy,
} from "@/features/memoir/utils";
