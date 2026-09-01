"use client";

/**
 * The CLIENT data path for onboarding.
 *
 * Everything here is user-triggered — a draft created when they start, answers
 * saved as they move, a claim when they sign up — which is exactly the case
 * TanStack Query is for. There is no `queries.ts` for this feature: none of it
 * can be fetched on the server, because before signup the only credential is a
 * token held in the browser's localStorage.
 *
 * Components never call `api.ts` directly. They call these hooks, so cache
 * keys and invalidation live in one place.
 */

import { useCallback, useSyncExternalStore } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { accountKeys } from "@/features/account/hooks";
import type {
  AccountOverview,
  MemoirSummary,
} from "@/features/account/schemas";
import { claimDraft, createDraft, updateDraft } from "@/features/onboarding/api";
import {
  clearStoredDraft,
  getDraftServerSnapshot,
  getDraftSnapshot,
  readStoredDraft,
  storeDraft,
  subscribeToDraft,
} from "@/features/onboarding/draftStorage";
import {
  relationshipGroupSchema,
  type DraftCreated,
  type DraftUpdate,
} from "@/features/onboarding/schemas";
import type { OnboardingState } from "@/features/onboarding/types";

/**
 * Cache keys as a factory rather than scattered string arrays. Hand-writing
 * `["onboarding", "me"]` at each call site is how invalidation quietly breaks.
 */
export const onboardingKeys = {
  all: ["onboarding"] as const,
};

/**
 * Translates the flow's UI state into the backend's column names.
 *
 * The interesting part is the years, where three UI facts collapse into two
 * columns:
 *
 *   picked "Present"   -> subject_is_living = true,  through_year = null
 *   picked a year      -> subject_is_living = false, through_year = that year
 *   never touched it   -> subject_is_living = null,  through_year = null
 *
 * That third case is why the column is nullable. "We didn't ask" and "no, they
 * have died" are different answers, and defaulting the first to `false` would
 * quietly record something the user never said.
 *
 * Postgres enforces the pairing independently: `draft_living_has_no_end_year`
 * rejects any row claiming someone is living *and* giving an end year.
 */
export function toDraftUpdate(state: OnboardingState): DraftUpdate {
  const isPresent = state.through === "present";

  // `state.rel` is typed as a loose string; only feed the backend a value the
  // enum actually accepts, so a stray value fails here rather than as a 400.
  const relationship = relationshipGroupSchema.safeParse(state.rel);

  return {
    subject_name: state.name.trim() || undefined,
    ...(relationship.success ? { relationship: relationship.data } : {}),
    relationship_label: state.relLabel.trim() || null,
    born_year: state.bornSet ? Number(state.born) : null,
    through_year: isPresent || !state.throughSet ? null : Number(state.through),
    subject_is_living: isPresent ? true : state.throughSet ? false : null,
    never_forget: state.deep.trim() || null,
  };
}

/**
 * Owns the anonymous draft: creating it, restoring it after a reload, saving
 * answers into it, and finally claiming it.
 */
export function useOnboardingDraft() {
  const queryClient = useQueryClient();

  // localStorage read as an external store rather than copied into state in an
  // effect. React handles the server/client split through the two snapshot
  // functions, so there is no hydration mismatch and no cascading re-render.
  const draft = useSyncExternalStore(
    subscribeToDraft,
    getDraftSnapshot,
    getDraftServerSnapshot,
  );

  const createMutation = useMutation({
    mutationFn: () => createDraft(),
    // No setState here: `storeDraft` notifies the store, and the subscription
    // above pushes the new value back into this component.
    onSuccess: storeDraft,
  });

  /**
   * Returns the draft, creating one if this is the first step taken.
   *
   * Called when the user leaves the pledge screen rather than on page load, so
   * a visitor who never starts does not leave a row behind.
   */
  const ensureDraft = useCallback(async (): Promise<DraftCreated | null> => {
    const existing = readStoredDraft();
    if (existing) return existing;
    try {
      return await createMutation.mutateAsync();
    } catch {
      // Deliberately swallowed. If the backend is down, the user should still
      // be able to answer the questions — the answers live in React state and
      // are re-sent in full at signup. Blocking the pledge button on a network
      // call would be a worse trade.
      return null;
    }
  }, [createMutation]);

  const saveMutation = useMutation({
    mutationFn: async (patch: DraftUpdate) => {
      const current = draft ?? readStoredDraft();
      if (!current) return null;
      return updateDraft(current.id, current.token, patch);
    },
  });

  /**
   * Best-effort incremental save, fired as the user moves between questions.
   *
   * Not awaited by the caller: a slow request must never make the next
   * question feel sluggish. Losing one of these is survivable because
   * `claim()` below re-sends every answer before claiming, so the row is
   * complete regardless of which intermediate saves landed.
   */
  const saveAnswers = useCallback(
    (patch: DraftUpdate) => {
      saveMutation.mutate(patch);
    },
    [saveMutation],
  );

  const claimMutation = useMutation<MemoirSummary, Error, OnboardingState>({
    mutationFn: async (state) => {
      const current = draft ?? readStoredDraft();
      if (!current) {
        throw new Error(
          "This browser has lost track of your answers. Please start again.",
        );
      }

      // Re-send everything first. This is what makes a dropped incremental
      // save harmless, and it is cheap — one PATCH against a row we are about
      // to read anyway.
      await updateDraft(current.id, current.token, toDraftUpdate(state));

      return claimDraft(current.id, current.token);
    },
    onSuccess: (memoir) => {
      // The draft is claimed; keeping its token would make every later save
      // 404, since the backend refuses to touch a claimed draft.
      clearStoredDraft();

      // Seed the /me cache from the claim response rather than refetching.
      // The dashboard renders immediately, and a later refetch still works.
      queryClient.setQueryData<AccountOverview | undefined>(
        accountKeys.me(),
        (previous) =>
          previous
            ? { ...previous, memoirs: [memoir, ...previous.memoirs] }
            : previous,
      );
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });

  return {
    draft,
    ensureDraft,
    saveAnswers,
    claim: claimMutation.mutateAsync,
    isClaiming: claimMutation.isPending,
    claimError: claimMutation.error,
  };
}
