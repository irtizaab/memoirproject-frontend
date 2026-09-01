/**
 * The feature's public surface, client-safe.
 *
 * No `server.ts`: every archive endpoint needs a token held in the browser, so
 * there is no server data path.
 */

export { ArchiveScreen } from "@/features/archive/components/ArchiveScreen";
export { MemoryComposer } from "@/features/archive/components/MemoryComposer";
export { MemoryDetail } from "@/features/archive/components/MemoryDetail";
export {
  archiveKeys,
  useCreateMemory,
  useDeleteMemory,
  useMemories,
  useMemory,
  useUpdateMemory,
} from "@/features/archive/hooks";
export type { Memory, MemoryKind } from "@/features/archive/schemas";
export {
  archiveEyebrow,
  archiveTitle,
  formatBytes,
  formatHappenedOn,
  formatYears,
  labelForKind,
} from "@/features/archive/utils";
