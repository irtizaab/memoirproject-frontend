"use client";

/**
 * The photographs and recordings being assembled for one memory.
 *
 * Shared by the owner's composer and the contributor's form. They ask the same
 * thing of a person — writing, pictures, voice, in any combination — and the
 * two used to hold near-identical copies of this state. Keeping it here is what
 * stops one of them quietly growing a bug the other does not have.
 *
 * The part worth reading is `toggle`. Turning a section off **discards what was
 * in it**, and revokes the object URLs on the way out. Anything else means a
 * recording the person believes they removed is still sitting in state and gets
 * uploaded when they press Save — which, on this product, is the worst possible
 * surprise.
 */

import { useCallback, useState } from "react";

import type { Photo } from "@/features/media/components/PhotoPicker";
import type { Recording } from "@/features/media/components/VoiceRecorder";

/** The three ways into a memory. Any combination, never exclusive. */
export type Mode = "voice" | "photo" | "text";

export function useAttachments(initial: Mode[] = ["text"]) {
  const [active, setActive] = useState<Set<Mode>>(() => new Set(initial));
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);

  const addPhotos = useCallback((picked: Photo[]) => {
    setPhotos((current) => [...current, ...picked]);
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((current) => {
      const going = current[index];
      if (going) URL.revokeObjectURL(going.previewUrl);
      return current.filter((_, i) => i !== index);
    });
  }, []);

  const addRecording = useCallback((recording: Recording) => {
    setRecordings((current) => [...current, recording]);
  }, []);

  const removeRecording = useCallback((index: number) => {
    setRecordings((current) => {
      const going = current[index];
      if (going) URL.revokeObjectURL(going.previewUrl);
      return current.filter((_, i) => i !== index);
    });
  }, []);

  /**
   * Light a section, or put it out and throw away what was in it.
   *
   * "Text" carries no object URLs, so turning it off only hides the field — the
   * caller clears the form value itself, since the text lives in react-hook-form
   * rather than here.
   */
  const toggle = useCallback((mode: Mode) => {
    setActive((current) => {
      const next = new Set(current);
      if (next.has(mode)) {
        next.delete(mode);
        if (mode === "photo") {
          setPhotos((existing) => {
            existing.forEach((p) => URL.revokeObjectURL(p.previewUrl));
            return [];
          });
        }
        if (mode === "voice") {
          setRecordings((existing) => {
            existing.forEach((r) => URL.revokeObjectURL(r.previewUrl));
            return [];
          });
        }
      } else {
        next.add(mode);
      }
      return next;
    });
  }, []);

  /** Everything back to nothing, after a successful save. */
  const reset = useCallback((to: Mode[] = ["text"]) => {
    setPhotos((existing) => {
      existing.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
    setRecordings((existing) => {
      existing.forEach((r) => URL.revokeObjectURL(r.previewUrl));
      return [];
    });
    setActive(new Set(to));
  }, []);

  return {
    active,
    isActive: (mode: Mode) => active.has(mode),
    toggle,
    photos,
    addPhotos,
    removePhoto,
    recordings,
    addRecording,
    removeRecording,
    reset,
  };
}
