/**
 * The feature's public surface, client-safe.
 *
 * No `server.ts` and no `queries.ts`: a search result changes in response to
 * what somebody is typing, which is the one condition `features/README.md`
 * gives for fetching on the client rather than the server.
 */

export { SearchScreen } from "@/features/search/components/SearchScreen";
export { searchKeys, useSearch } from "@/features/search/hooks";
export type { SearchSource } from "@/features/search/hooks";
export type { SearchHit, SearchKind, SearchResults } from "@/features/search/schemas";
