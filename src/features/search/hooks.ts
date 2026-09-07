"use client";

/**
 * The client data path for search.
 *
 * Client-only, and this is the one place in the repo where that needs saying
 * out loud rather than following from the credential: a search result changes
 * in response to what a person is typing, which is exactly the rule in
 * `features/README.md` for reaching for TanStack Query.
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { searchArchive, searchMemoir } from "@/features/search/api";
import type { SearchResults } from "@/features/search/schemas";

/**
 * Which memoir, and what proves you may search it.
 *
 * A discriminated union rather than four optional fields, so the screen cannot
 * be rendered with half a credential.
 */
export type SearchSource =
  | { kind: "archive"; memoirId: string }
  | { kind: "reader"; token: string; reader: string };

export const searchKeys = {
  all: ["search"] as const,
  results: (source: SearchSource, query: string) =>
    [
      ...searchKeys.all,
      source.kind === "archive" ? source.memoirId : source.token,
      query,
    ] as const,
};

/**
 * Waits for somebody to stop typing.
 *
 * 250ms, which is long enough that a search is one request per word rather
 * than one per letter, and short enough that it still feels like the page is
 * keeping up. Written here rather than in `src/hooks/` because it has exactly
 * one caller — the rule that folder's README states.
 */
function useSettled(value: string, delay = 250): string {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return settled;
}

/**
 * What matches, as somebody types.
 *
 * `placeholderData` keeps the previous results on screen while the next ones
 * are fetched, so the page does not blink to empty between keystrokes — the
 * thing that makes a search box feel broken even when it is fast.
 *
 * Nothing is requested for a query of fewer than two characters. One letter
 * matches most of a memoir and is never what anybody meant.
 */
export function useSearch(source: SearchSource, query: string) {
  const settled = useSettled(query.trim());
  const enabled = settled.length >= 2;

  return useQuery<SearchResults>({
    queryKey: searchKeys.results(source, settled),
    queryFn: () =>
      source.kind === "archive"
        ? searchArchive(source.memoirId, settled)
        : searchMemoir(source.token, source.reader, settled),
    enabled,
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });
}
