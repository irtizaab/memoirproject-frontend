/**
 * The feature's public surface, client-safe.
 *
 * No `server.ts`: an upload starts from a file the person just chose in their
 * browser, so none of it can happen during server rendering.
 */

export { uploadAll, uploadFile } from "@/features/media/api";
export {
  PhotoPicker,
  type Photo,
} from "@/features/media/components/PhotoPicker";
export {
  VoiceRecorder,
  type Recording,
} from "@/features/media/components/VoiceRecorder";
export { TranscriptReader } from "@/features/media/components/TranscriptReader";
export { mediaAssetSchema, transcriptSchema } from "@/features/media/schemas";
export {
  formatDuration,
  hasPendingTranscript,
  totalDuration,
} from "@/features/media/utils";
export { useAttachments, type Mode } from "@/features/media/useAttachments";
export type {
  AssetKind,
  MediaAsset,
  Transcript,
  TranscriptSegment,
  UploadCredential,
} from "@/features/media/schemas";
