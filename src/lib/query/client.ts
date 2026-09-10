/**
 * TanStack Query defaults for the client-side data path.
 *
 * These defaults are set once here rather than per-hook, so every feature
 * behaves consistently and a new feature gets sensible behaviour for free.
 */

import { QueryClient } from "@tanstack/react-query";

import { isApiError } from "@/lib/api/errors";

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for a minute; remounting a component in
        // that window reads from cache instead of re-hitting the backend.
        staleTime: 60_000,
        retry: (failureCount, error) => {
          // A 4xx means we sent something wrong. Sending it again three more
          // times will not fix it — and a contract mismatch is a bug, not a
          // transient failure. Only retry things that might genuinely recover.
          if (
            isApiError(error) &&
            (error.isClientError || error.code === "contract")
          ) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        // Mutations are never retried automatically: the request may have been
        // applied server-side before the response was lost.
        retry: false,
      },
    },
  });
}
