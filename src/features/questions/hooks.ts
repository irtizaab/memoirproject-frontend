"use client";

/**
 * The client data path for the questions screen.
 *
 * All of it is client-side: every call needs the owner's bearer token, which
 * lives in the browser, so there is no server render to be had — the same
 * reason `features/contributors` has no `queries.ts`.
 *
 * Every mutation returns the whole library and writes it straight into the
 * cache, rather than invalidating and refetching. The backend already sends
 * the finished screen back from each write, so a refetch would be a second
 * round trip to learn what the first one just told us.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteQuestion,
  generateLibrary,
  getLibrary,
  setMode,
  updateQuestion,
} from "@/features/questions/api";
import type {
  Question,
  QuestionLibrary,
  QuestionsMode,
} from "@/features/questions/schemas";

export const questionKeys = {
  all: ["questions"] as const,
  library: (memoirId: string) => [...questionKeys.all, memoirId] as const,
};

export function useQuestionLibrary(memoirId: string | null) {
  return useQuery({
    queryKey: questionKeys.library(memoirId ?? "none"),
    queryFn: () => getLibrary(memoirId as string),
    enabled: Boolean(memoirId),
  });
}

/**
 * Draft a library.
 *
 * Deliberately *not* caught here, unlike the follow-up question this replaced.
 * The owner pressed a button and is watching; a failure they are not told
 * about looks like a button that does nothing. The screen renders the error
 * and says the standard questions are still there — which is true, and is why
 * the failure is survivable rather than silent.
 */
export function useGenerateLibrary(memoirId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    QuestionLibrary,
    Error,
    { notes: string | null; replaceEdited?: boolean }
  >({
    mutationFn: ({ notes, replaceEdited }) =>
      generateLibrary(memoirId, notes, replaceEdited),
    onSuccess: (library) => {
      queryClient.setQueryData(questionKeys.library(memoirId), library);
    },
  });
}

export function useSetQuestionsMode(memoirId: string) {
  const queryClient = useQueryClient();

  return useMutation<QuestionLibrary, Error, QuestionsMode>({
    mutationFn: (mode) => setMode(memoirId, mode),
    onSuccess: (library) => {
      queryClient.setQueryData(questionKeys.library(memoirId), library);
    },
  });
}

/**
 * Rewrite one question.
 *
 * Patches the single row into the cached library rather than replacing the
 * whole thing, so editing one question does not re-render every other one — and
 * so the `source: "owner"` that came back is visible immediately, since that is
 * the change the owner most needs to see.
 */
export function useUpdateQuestion(memoirId: string) {
  const queryClient = useQueryClient();

  return useMutation<Question, Error, { questionId: string; body: string }>({
    mutationFn: ({ questionId, body }) => updateQuestion(questionId, body),
    onSuccess: (updated) => {
      queryClient.setQueryData<QuestionLibrary>(
        questionKeys.library(memoirId),
        (library) =>
          library && {
            ...library,
            groups: library.groups.map((group) => ({
              ...group,
              questions: group.questions.map((question) =>
                question.id === updated.id ? updated : question,
              ),
            })),
          },
      );
    },
  });
}

/**
 * Delete one question.
 *
 * Optimistic. Putting a deleted question back because a request failed is
 * worse than leaving it gone: the owner has already moved on, and the next
 * page load is the correction.
 */
export function useDeleteQuestion(memoirId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (questionId) => deleteQuestion(questionId),
    onMutate: async (questionId) => {
      const key = questionKeys.library(memoirId);
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<QuestionLibrary>(
        key,
        (library) =>
          library && {
            ...library,
            groups: library.groups.map((group) => ({
              ...group,
              questions: group.questions.filter((q) => q.id !== questionId),
            })),
          },
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: questionKeys.library(memoirId),
      });
    },
  });
}
