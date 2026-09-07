/**
 * The feature's public surface, client-safe.
 *
 * No `server.ts`: every archive endpoint needs a token held in the browser, so
 * there is no server data path.
 */

export { ArchiveScreen } from "@/features/archive/components/ArchiveScreen";
export { BookPanel } from "@/features/archive/components/BookPanel";
/* Exported for `features/contributors`, which lists one person's memories with
   the same tile the archive uses. Two tiles that were meant to look identical
   is how one of them quietly stops matching. */
export { MemoryCard } from "@/features/archive/components/MemoryCard";
export { MemoryComposer } from "@/features/archive/components/MemoryComposer";
export { MemoryDetail } from "@/features/archive/components/MemoryDetail";
export { MemoryEditor } from "@/features/archive/components/MemoryEditor";
export {
  archiveKeys,
  useAssembleMemoir,
  useAttachAssets,
  useCreateMemory,
  useDeleteMemory,
  useExportMemoir,
  useMemories,
  useMemory,
  usePublishMemoir,
  useRemoveAsset,
  useReplacePassphrase,
  useUpdateMemory,
} from "@/features/archive/hooks";
export type {
  AssemblyResult,
  MemoirPublication,
  Memory,
  MemoryKind,
} from "@/features/archive/schemas";
export {
  archiveEyebrow,
  archiveTitle,
  formatBytes,
  formatHappenedOn,
  formatYears,
  labelForKind,
} from "@/features/archive/utils";
