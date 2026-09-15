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

import { accountKeys } from "@/features/account";
import {
  assembleMemoir,
  attachAssets,
  createMemory,
  deleteMemory,
  exportMemoirPdf,
  generatePlan,
  getMemory,
  getPlan,
  listChat,
  listMemories,
  publishMemoir,
  removeAsset,
  replacePassphrase,
  sendChat,
  updateMemory,
} from "@/features/archive/api";
import type {
  AssemblyResult,
  ChatMessage,
  ChatReply,
  MemoirPlan,
  MemoirPublication,
  Memory,
  MemoryCreate,
} from "@/features/archive/schemas";
import { isApiError } from "@/lib/api/errors";
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
  plan: (memoirId: string) => [...archiveKeys.all, "plan", memoirId] as const,
  chat: (memoirId: string) => [...archiveKeys.all, "chat", memoirId] as const,
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

/* -------------------------------------------------------------------------
 * The book
 * ------------------------------------------------------------------------- */

/**
 * Assembles the archive into chapters.
 *
 * Invalidates `GET /me`, not the memory list: nothing about the memories
 * changed, and what the dashboard needs to hear is that `chapter_count` moved
 * off zero — which is what unlocks reading the book and exporting it.
 */
/**
 * The stored plan, or `null` when nobody has planned this memoir yet.
 *
 * "Not planned" arrives as a 404, which is the honest status — there is no
 * such resource — but it is a normal state and not a failure, so it is mapped
 * to `null` here rather than left to every component to recognise. A real 404
 * (somebody else's memoir) is indistinguishable by design and lands in the
 * same place, which is correct: either way there is no plan to show.
 *
 * No retry, for the same reason. Retrying a 404 three times to be told the
 * same thing costs a second of the owner looking at a spinner.
 */
export function usePlan(memoirId: string | null) {
  return useQuery<MemoirPlan | null>({
    queryKey: archiveKeys.plan(memoirId ?? "none"),
    queryFn: async () => {
      if (!memoirId) return null;
      try {
        return await getPlan(memoirId);
      } catch (error) {
        if (isApiError(error) && error.status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(memoirId),
    retry: false,
  });
}

/**
 * Reads the archive, decides what the book is, and writes it. The slow one.
 *
 * Two requests underneath — `POST /plan` then `POST /assemble` — because the
 * plan is still a row the guide edits between builds. To the owner they were
 * one decision asked twice, so one button and one mutation. The plan comes
 * back written straight into the cache: a five-minute wait should not be
 * followed by a second request to be told what we were just handed. `GET /me`
 * is invalidated for `chapter_count`, which gates the reader and the export.
 */
export function useBuildMemoir(memoirId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<AssemblyResult, Error, void>({
    mutationFn: async () => {
      if (!memoirId) throw new Error("No memoir is loaded yet.");
      const plan = await generatePlan(memoirId);
      queryClient.setQueryData(archiveKeys.plan(memoirId), plan);
      return assembleMemoir(memoirId);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.me() });
      // The plan too: `assembled_at` has just been stamped on it. And the
      // conversation, where the guide has just said what was built.
      void queryClient.invalidateQueries({
        queryKey: archiveKeys.plan(memoirId ?? "none"),
      });
      void queryClient.invalidateQueries({
        queryKey: archiveKeys.chat(memoirId ?? "none"),
      });
    },
  });
}

/**
 * Seals the memoir behind a passphrase.
 *
 * Also invalidates `GET /me`, which is where the view token appears — the
 * address the owner is about to send to their family.
 */
export function usePublishMemoir(memoirId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<MemoirPublication, Error, string>({
    mutationFn: (passphrase) => {
      if (!memoirId) throw new Error("No memoir is loaded yet.");
      return publishMemoir(memoirId, passphrase);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.me() });
    },
  });
}

/** Replaces the passphrase. Nothing cached changes — only what opens the book. */
export function useReplacePassphrase(memoirId: string | null) {
  return useMutation<undefined, Error, string>({
    mutationFn: (passphrase) => {
      if (!memoirId) throw new Error("No memoir is loaded yet.");
      return replacePassphrase(memoirId, passphrase);
    },
  });
}

/**
 * Downloads the memoir as a PDF.
 *
 * A mutation rather than a query because it is an action a person takes, and
 * because caching a file nobody asked for twice would be a megabyte held in
 * memory for no reason. The blob URL is revoked as soon as the click has
 * happened — the browser has the bytes by then.
 */
export function useExportMemoir(memoirId: string | null) {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!memoirId) throw new Error("No memoir is loaded yet.");

      const { blob, filename } = await exportMemoirPdf(memoirId);
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename ?? "memoir.pdf";
      link.click();

      URL.revokeObjectURL(url);
    },
  });
}

/** The conversation with the guide. */
export function useChat(memoirId: string | null) {
  return useQuery<ChatMessage[]>({
    queryKey: archiveKeys.chat(memoirId ?? "none"),
    queryFn: () => listChat(memoirId as string),
    enabled: Boolean(memoirId),
  });
}

/**
 * Say something to the guide.
 *
 * The owner's message is shown at once, before the reply — the guide can take
 * minutes when it plans again, and a question that vanishes into a spinner
 * reads as lost. On reply, the guide's message is appended and, if it planned
 * again, the plan cache is replaced the way `useGeneratePlan` does it.
 */
export function useSendChat(memoirId: string | null) {
  const queryClient = useQueryClient();
  const key = archiveKeys.chat(memoirId ?? "none");

  return useMutation<ChatReply, Error, string>({
    mutationFn: (body) => {
      if (!memoirId) throw new Error("No memoir is loaded yet.");
      return sendChat(memoirId, body);
    },
    onMutate: (body) => {
      queryClient.setQueryData<ChatMessage[]>(key, (was = []) => [
        ...was,
        {
          id: `pending-${Date.now()}`,
          role: "owner",
          body,
          replanned: false,
          created_at: new Date().toISOString(),
        },
      ]);
    },
    onSuccess: (result) => {
      queryClient.setQueryData<ChatMessage[]>(key, (was = []) => [
        ...was,
        result.reply,
      ]);
      if (result.plan) {
        queryClient.setQueryData(
          archiveKeys.plan(memoirId ?? "none"),
          result.plan,
        );
      }
    },
    onSettled: () => {
      // Whatever happened, the server's list is the truth.
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
