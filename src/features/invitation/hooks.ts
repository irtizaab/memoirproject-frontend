"use client";

/**
 * The client data path for contributing.
 *
 * The invitation itself is fetched on the server (see `queries.ts`) because it
 * needs no credential. Everything here is user-triggered — submitting a
 * memory, reading back what you have added — which is what TanStack Query is
 * for.
 */

import { useCallback, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listMyContributions,
  submitContribution,
} from "@/features/invitation/api";
import {
  getContributorServerSnapshot,
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
 */
export function useContributorToken(linkToken: string): string | null {
  const getSnapshot = useCallback(
    () => readContributorToken(linkToken),
    [linkToken],
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
export function useSubmitContribution(linkToken: string) {
  const queryClient = useQueryClient();

  return useMutation<ContributionReceipt, Error, Contribution>({
    mutationFn: (contribution) => submitContribution(linkToken, contribution),
    onSuccess: (receipt) => {
      storeContributorToken(linkToken, receipt.participant_token);
      void queryClient.invalidateQueries({
        queryKey: invitationKeys.mine(linkToken),
      });
    },
  });
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
