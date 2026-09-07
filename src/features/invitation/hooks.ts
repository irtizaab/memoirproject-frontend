"use client";

/**
 * The client data path for contributing.
 *
 * The invitation itself is fetched on the server (see `queries.ts`) because it
 * needs no credential. Everything here is user-triggered — submitting a
 * memory, reading back what you have added — which is what TanStack Query is
 * for.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listMyContributions,
  submitContribution,
} from "@/features/invitation/api";
import {
  getContributorServerSnapshot,
  migrateContributorToken,
  readContributorToken,
  storeContributorToken,
  subscribeToContributor,
} from "@/features/invitation/contributorStorage";
import type {
  Contribution,
  ContributionReceipt,
} from "@/features/invitation/schemas";
import { hasPendingTranscript } from "@/features/media";

export const invitationKeys = {
  all: ["invitation"] as const,
  mine: (linkToken: string) =>
    [...invitationKeys.all, "mine", linkToken] as const,
};

/**
 * The token that makes this browser the same person as last time.
 *
 * Read through `useSyncExternalStore` rather than copied into state in an
 * effect: React handles the server/client split through the two snapshot
 * functions, so there is no hydration mismatch and no cascading render.
 *
 * Keyed on the memoir rather than the link — a reissued link must not forget
 * the people who already contributed. `linkToken` is still needed for one
 * thing: carrying across a token stored under the old key. See
 * `contributorStorage.ts`.
 */
export function useContributorToken(
  memoirId: string,
  linkToken: string,
): string | null {
  useEffect(() => {
    migrateContributorToken(memoirId, linkToken);
  }, [memoirId, linkToken]);

  const getSnapshot = useCallback(
    () => readContributorToken(memoirId),
    [memoirId],
  );

  return useSyncExternalStore(
    subscribeToContributor,
    getSnapshot,
    getContributorServerSnapshot,
  );
}

/**
 * Submits a memory through the link, and remembers who left it.
 *
 * The token comes back on every response, not just the first, so storing it
 * unconditionally keeps a browser that lost it — cleared storage, a different
 * device — recognised again from its next contribution onwards.
 */
export function useSubmitContribution(linkToken: string, memoirId: string) {
  const queryClient = useQueryClient();

  return useMutation<ContributionReceipt, Error, Contribution>({
    mutationFn: (contribution) => submitContribution(linkToken, contribution),
    onSuccess: (receipt) => {
      storeContributorToken(memoirId, receipt.participant_token);
      void queryClient.invalidateQueries({
        queryKey: invitationKeys.mine(linkToken),
      });
    },
  });
}

/**
 * Remembers a participant token issued somewhere other than the contribute form.
 *
 * `features/memoir` needs this: somebody who left memories months ago and now
 * leaves a comment on the finished book is the **same person**, and the token
 * that proves it is the one already stored here. A second copy of the storage
 * key in the reader would be the bug this file's header describes arriving by
 * a different route — the same human appearing twice in one memoir.
 *
 * A hook rather than re-exporting `storeContributorToken`, so the key and the
 * "scoped to the memoir, not the link" rule stay in one place.
 */
export function useRememberContributorFor() {
  /**
   * The same thing as `useRememberContributor`, for a caller that does not know
   * which memoir it is until the answer arrives.
   *
   * The reader's gate is that caller: it holds a view link, and the memoir id
   * comes back with the session. Storage still happens here rather than in
   * `features/memoir`, which is the rule this file exists to keep — one place
   * decides how a person with no account is remembered.
   */
  return useCallback((memoirId: string, token: string | null) => {
    if (token) storeContributorToken(memoirId, token);
  }, []);
}

export function useRememberContributor(memoirId: string) {
  return useCallback(
    (token: string | null) => {
      // Null is the owner commenting, who has a real account. Handing them a
      // second, weaker credential is exactly what the backend refuses to do.
      if (token) storeContributorToken(memoirId, token);
    },
    [memoirId],
  );
}

/**
 * What this contributor has already added.
 *
 * Their own contributions and nothing else — never the archive, never anyone
 * else's memories. Disabled until they have a token, because before the first
 * submission there is nobody to ask about.
 */
export function useMyContributions(
  linkToken: string,
  participantToken: string | null,
) {
  return useQuery({
    queryKey: invitationKeys.mine(linkToken),
    queryFn: () => listMyContributions(linkToken, participantToken as string),
    enabled: Boolean(participantToken),
    // The same rule as the archive: poll while a recording of theirs is still
    // being transcribed, and stop as soon as none is.
    refetchInterval: (query) =>
      hasPendingTranscript(query.state.data) ? 5000 : false,
  });
}
