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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listThreads, postComment } from "@/features/memoir/api";
import type {
  CommentCreate,
  CommentReceipt,
  CommentThread,
} from "@/features/memoir/schemas";

export const memoirKeys = {
  all: ["memoir"] as const,
  threads: (chapterId: string) =>
    [...memoirKeys.all, "threads", chapterId] as const,
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
  token: string,
  chapterId: string,
  reader: string | null,
  initial: CommentThread[],
) {
  return useQuery({
    queryKey: memoirKeys.threads(chapterId),
    queryFn: () => listThreads(token, chapterId, reader),
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
  token: string,
  chapterId: string,
  reader: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation<CommentReceipt, Error, CommentCreate>({
    mutationFn: (comment) => postComment(token, chapterId, reader, comment),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: memoirKeys.threads(chapterId),
      });
    },
  });
}
