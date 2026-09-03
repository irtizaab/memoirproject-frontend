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

import { useRememberContributor } from "@/features/invitation";
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
  initial: CommentThread[],
) {
  return useQuery({
    queryKey: memoirKeys.threads(chapterId),
    queryFn: () => listThreads(token, chapterId),
    initialData: initial,
  });
}

/**
 * Leaves a comment, and remembers who left it.
 *
 * `useRememberContributor` writes the participant token into the **same**
 * browser storage `features/invitation` uses, keyed on the memoir. That is the
 * point of borrowing it: somebody who sent memories months ago and comments
 * today is one person, and a second copy of that key would put them in the
 * memoir twice.
 *
 * The token comes back on every response, not only the first, so storing it
 * unconditionally re-recognises a browser that lost it.
 */
export function useLeaveComment(
  token: string,
  chapterId: string,
  memoirId: string,
) {
  const queryClient = useQueryClient();
  const remember = useRememberContributor(memoirId);

  return useMutation<CommentReceipt, Error, CommentCreate>({
    mutationFn: (comment) => postComment(token, chapterId, comment),
    onSuccess: (receipt) => {
      remember(receipt.participant_token);
      void queryClient.invalidateQueries({
        queryKey: memoirKeys.threads(chapterId),
      });
    },
  });
}
