"use client";

/**
 * The client data path for the contributors screen.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { accountKeys } from "@/features/account";
import { listContributors, reissueLink } from "@/features/contributors/api";
import type { ShareLink } from "@/features/contributors/schemas";

export const contributorKeys = {
  all: ["contributors"] as const,
  list: (memoirId: string) => [...contributorKeys.all, memoirId] as const,
};

export function useContributors(memoirId: string | null) {
  return useQuery({
    queryKey: contributorKeys.list(memoirId ?? "none"),
    queryFn: () => listContributors(memoirId as string),
    enabled: Boolean(memoirId),
  });
}

/**
 * Revokes the share link and issues a new one.
 *
 * Invalidates the account cache as well as its own, because `GET /me` carries
 * `link_token` and the archive's invite banner reads it from there. Without
 * that second invalidation the banner would keep offering a dead link.
 */
export function useReissueLink(memoirId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<ShareLink, Error, void>({
    mutationFn: () => {
      if (!memoirId) throw new Error("No memoir is loaded yet.");
      return reissueLink(memoirId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: contributorKeys.list(memoirId ?? "none"),
      });
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}
