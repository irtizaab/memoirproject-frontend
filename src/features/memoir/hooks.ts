"use client";

/**
 * The CLIENT data path for the reader.
 *
 * Almost nothing here. The prose, the photographs and the credits are fetched
 * on the server (`queries.ts`) because a view link needs no browser-held
 * credential — so a family opening a memoir gets the words in the first
 * response.
 *
 * What is left is the one thing that changes in response to the person
 * reading: the comment layer. That is what TanStack Query is for, and the rule
 * in `features/README.md` is exactly this line.
 */

import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  editChapter,
  getOwnerChapter,
  getOwnerReading,
  listThreads,
  postComment,
} from "@/features/memoir/api";
import type {
  Chapter,
  ChapterEdit,
  CommentCreate,
  CommentReceipt,
  CommentThread,
} from "@/features/memoir/schemas";

export const memoirKeys = {
  all: ["memoir"] as const,
  threads: (chapterId: string) =>
    [...memoirKeys.all, "threads", chapterId] as const,
  preview: (memoirId: string) =>
    [...memoirKeys.all, "preview", memoirId] as const,
  previewChapter: (chapterId: string) =>
    [...memoirKeys.all, "preview", "chapter", chapterId] as const,
};

/**
 * The conversation on one chapter.
 *
 * Seeded from what the server already sent, so the page renders its comments
 * immediately and this only ever refetches after somebody adds one. There is
 * no `refetchInterval`: a memoir is not a chat window, and a reader who wants
 * to know whether anyone replied can reload the page like they would a book
 * they put down.
 */
export function useThreads(
  token: string | null,
  chapterId: string,
  reader: string | null,
  initial: CommentThread[],
) {
  return useQuery({
    queryKey: memoirKeys.threads(chapterId),
    // `skipToken` rather than `enabled`, because it also narrows the token:
    // with no view link there is nothing to ask through — the owner previewing
    // their own unsealed memoir — and `listThreads` without one is a 404,
    // which is a lie in the console on a page that is working correctly.
    queryFn: token ? () => listThreads(token, chapterId, reader) : skipToken,
    initialData: initial,
  });
}

/**
 * Leaves a comment.
 *
 * It used to also remember who left it, by storing the participant token that
 * came back on the receipt. That moved to the door: identity is established
 * once, when the memoir is opened, and `MemoirGate` is what writes it down
 * through `useRememberContributor` — the same storage `features/invitation`
 * uses, keyed on the memoir, so somebody who sent memories months ago and
 * reads today is one person rather than two.
 *
 * What is left here is the mutation and the invalidation, which is all a
 * comment ever needed to be.
 */
export function useLeaveComment(
  token: string | null,
  chapterId: string,
  reader: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation<CommentReceipt, Error, CommentCreate>({
    // Null only where the composer is never rendered — see `useThreads`. A
    // mutation cannot be skipped the way a query can, so it refuses instead of
    // sending a comment nobody could have written.
    mutationFn: (comment) =>
      token
        ? postComment(token, chapterId, reader, comment)
        : Promise.reject(new Error("This memoir has not been sealed yet.")),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: memoirKeys.threads(chapterId),
      });
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  The owner's preview                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The book, read by its keeper before it is sealed.
 *
 * The one part of this feature that is fetched in the browser rather than on
 * the server, and for a reason that is not a preference: the owner's
 * credential is a Supabase session held in `localStorage`, which a server
 * render cannot see. The family's copy stays server-rendered — they arrive
 * with a cookie, which does reach the server.
 *
 * `staleTime: 0` and no polling. A preview is read once, deliberately, by
 * somebody about to make an irreversible decision.
 */
export function useOwnerReading(memoirId: string) {
  return useQuery({
    queryKey: memoirKeys.preview(memoirId),
    queryFn: () => getOwnerReading(memoirId),
  });
}

/** One chapter of it. Null id on the matter pages, which need no chapter. */
export function useOwnerChapter(chapterId: string | null) {
  return useQuery({
    queryKey: memoirKeys.previewChapter(chapterId ?? "none"),
    queryFn: chapterId ? () => getOwnerChapter(chapterId) : skipToken,
  });
}

/**
 * The owner's corrections to one page.
 *
 * The response is written straight into the cache rather than invalidated: it
 * *is* the chapter as stored, so a refetch would ask for what is already in
 * hand — and the credits in it have just been re-surveyed, which is the part
 * the owner needs to see immediately rather than one round trip later.
 *
 * The covers are invalidated, because a renamed chapter changes the contents
 * rail and the title page.
 */
export function useEditChapter(chapterId: string, memoirId: string) {
  const queryClient = useQueryClient();

  return useMutation<Chapter, Error, ChapterEdit>({
    mutationFn: (edit) => editChapter(chapterId, edit),
    onSuccess: (chapter) => {
      queryClient.setQueryData(memoirKeys.previewChapter(chapterId), chapter);
      void queryClient.invalidateQueries({
        queryKey: memoirKeys.preview(memoirId),
      });
    },
  });
}
