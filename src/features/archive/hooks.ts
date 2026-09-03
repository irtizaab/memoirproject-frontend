"use client";

/**
 * The client data path for the archive.
 *
 * There is no `queries.ts`: every one of these endpoints is authenticated with
 * a Supabase token held in the browser, so none of it can be fetched during
 * server rendering.
 *
 * Components never call `api.ts` directly — they call these hooks, so cache
 * keys and invalidation live in one place.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import {
  attachAssets,
  createMemory,
  deleteMemory,
  getMemory,
  listMemories,
  removeAsset,
  updateMemory,
} from "@/features/archive/api";
import type { Memory, MemoryCreate } from "@/features/archive/schemas";
import { hasPendingTranscript } from "@/features/media";

/**
 * Cache keys as a factory. Scoped by memoir id, so a second memoir cannot read
 * the first one's list out of the cache.
 */
export const archiveKeys = {
  all: ["archive"] as const,
  memories: (memoirId: string) =>
    [...archiveKeys.all, "memories", memoirId] as const,
  memory: (memoryId: string) =>
    [...archiveKeys.all, "memory", memoryId] as const,
};

/**
 * Refresh both places a memory is cached: the archive list, and the entry the
 * detail page reads.
 *
 * Both, every time. Invalidating only the list is what made an edit made from
 * the detail page appear on the grid and not on the page it was made from —
 * the same data, cached under two keys, and only one of them refreshed.
 */
function invalidateMemory(
  queryClient: QueryClient,
  memoirId: string | null,
  memoryId: string,
): void {
  void queryClient.invalidateQueries({
    queryKey: archiveKeys.memories(memoirId ?? "none"),
  });
  void queryClient.invalidateQueries({
    queryKey: archiveKeys.memory(memoryId),
  });
}

/**
 * Every memory in the memoir.
 *
 * `enabled` on the id, because the memoir arrives from `GET /me` a moment
 * after the page mounts and firing this with `undefined` would be a guaranteed
 * 404.
 */
export function useMemories(memoirId: string | null) {
  return useQuery({
    queryKey: archiveKeys.memories(memoirId ?? "none"),
    queryFn: () => listMemories(memoirId as string),
    enabled: Boolean(memoirId),

    /*
      Poll only while a recording is still being transcribed, and stop the
      moment none is.

      This is the whole delivery mechanism for a finished transcript, and it
      costs nothing the rest of the time: an archive of photographs, or one
      whose transcripts have all landed, returns false here and never refetches.

      Five seconds because a transcript takes roughly a tenth of the
      recording's length, so a two-minute voice note is ready in about twelve —
      two or three polls, not thirty.
    */
    refetchInterval: (query) =>
      hasPendingTranscript(query.state.data) ? 5000 : false,
  });
}

/** Records a new memory and refreshes the list it belongs to. */
export function useCreateMemory(memoirId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<Memory, Error, MemoryCreate>({
    mutationFn: (memory) => {
      if (!memoirId) throw new Error("No memoir is loaded yet.");
      return createMemory(memoirId, memory);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: archiveKeys.memories(memoirId ?? "none"),
      });
    },
  });
}

/**
 * Edits a memory in place.
 *
 * `happened_on` is in the variables because the date is editable — the API
 * function has always accepted it, and leaving it out of this type is what
 * made the date unreachable from the UI.
 */
export function useUpdateMemory(memoirId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<
    Memory,
    Error,
    {
      memoryId: string;
      title?: string | null;
      body_text?: string | null;
      happened_on?: string | null;
    }
  >({
    mutationFn: ({ memoryId, ...patch }) => updateMemory(memoryId, patch),
    onSuccess: (_memory, { memoryId }) =>
      invalidateMemory(queryClient, memoirId, memoryId),
  });
}

/** Adds uploaded photographs or recordings to a memory that already exists. */
export function useAttachAssets(memoirId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<Memory, Error, { memoryId: string; assetIds: string[] }>({
    mutationFn: ({ memoryId, assetIds }) => attachAssets(memoryId, assetIds),
    onSuccess: (_memory, { memoryId }) =>
      invalidateMemory(queryClient, memoirId, memoryId),
  });
}

/**
 * Removes one photograph or recording.
 *
 * Not optimistic, for the same reason `useDeleteMemory` is not: this destroys
 * a file. A thumbnail that disappears and then returns because the request
 * failed is worse than one that takes a moment to go.
 */
export function useRemoveAsset(memoirId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<Memory, Error, { memoryId: string; assetId: string }>({
    mutationFn: ({ memoryId, assetId }) => removeAsset(memoryId, assetId),
    onSuccess: (_memory, { memoryId }) =>
      invalidateMemory(queryClient, memoirId, memoryId),
  });
}

/**
 * Deletes a memory.
 *
 * No optimistic removal. This is irreversible and takes the person's
 * photographs and recordings with it, so the row stays on screen until the
 * server has confirmed it is really gone — a card that vanishes and comes back
 * because the request failed is worse than one that takes a moment to go.
 */
export function useDeleteMemory(memoirId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (memoryId) => deleteMemory(memoryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: archiveKeys.memories(memoirId ?? "none"),
      });
    },
  });
}


/**
 * One memory, for the detail page.
 *
 * `initialData` is pulled out of the list this memory almost certainly came
 * from, so opening a card renders instantly and the fetch behind it is only a
 * refresh. A link opened cold finds nothing there and fetches normally.
 *
 * The same `refetchInterval` rule as the list: poll while a recording on this
 * memory is still being transcribed, and stop when none is.
 */
export function useMemory(memoirId: string | null, memoryId: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: archiveKeys.memory(memoryId),
    queryFn: () => getMemory(memoryId),
    initialData: () => {
      const list = queryClient.getQueryData<Memory[]>(
        archiveKeys.memories(memoirId ?? "none"),
      );
      return list?.find((memory) => memory.id === memoryId);
    },
    refetchInterval: (query) =>
      hasPendingTranscript(query.state.data ? [query.state.data] : undefined)
        ? 5000
        : false,
  });
}
