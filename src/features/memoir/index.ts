/**
 * The feature's public surface, client-safe.
 *
 * Deliberately not exported: `api.ts`, `useLanes.ts` and the reader's inner
 * components. Callers compose one page of the book — `TitlePage`,
 * `ChapterReader`, `PeoplePage` or `ColophonPage` — inside `ReaderFrame`,
 * which is what keeps the four-column geometry and the "the prose never moves"
 * rule in one place.
 *
 * `server.ts` sits beside this for the data path: a view link needs no
 * credential, so the family's copy is fetched on the server. The owner's
 * preview is the exception and uses the hooks below, because their credential
 * is a Supabase session a server render cannot see.
 */

export {
  ColophonPage,
  PeoplePage,
  TitlePage,
} from "@/features/memoir/components/BookMatter";
export { ChapterReader } from "@/features/memoir/components/ChapterReader";
export { PageEditor } from "@/features/memoir/components/PageEditor";
export { MemoirGate } from "@/features/memoir/components/MemoirGate";
export { ReaderFrame } from "@/features/memoir/components/ReaderFrame";
export {
  memoirKeys,
  useEditChapter,
  useLeaveComment,
  useOwnerChapter,
  useOwnerReading,
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
