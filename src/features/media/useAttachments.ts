"use client";

/**
 * The photographs and recordings being assembled for one memory.
 *
 * Shared by the owner's composer and the contributor's form. They ask the same
 * thing of a person — writing, pictures, voice, in any combination — and the
 * two used to hold near-identical copies of this state. Keeping it here is what
 * stops one of them quietly growing a bug the other does not have.
 *
 * The part worth reading is the split between `toggle` and `discard`. Putting a
 * section out still throws away what was in it — anything else means a recording
 * the person believes they removed is still sitting in state and gets uploaded
 * when they press Save, which on this product is the worst possible surprise.
 *
 * But that used to happen on **one tap of the tile**, with no confirm and no
 * undo, and the files exist nowhere else: `PhotoPicker` keeps only its
 * downscaled blob, a recording's chunks only ever lived in this array, and
 * nothing is uploaded until Save. A mis-tap next to a two-minute voice note
 * destroyed it. So `toggle` now only does the harmless half — lighting a
 * section, and putting out one that holds nothing — and `holds` lets the caller
 * ask first. `discard` is the destructive path, and a caller reaches it only
 * after the person has said so.
 *
 * Note which way round this was: deleting an already-saved asset in
 * `MemoryEditor` was behind a two-tap confirm, and the unrecoverable case was
 * not.
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

  /** Is there anything in this section that turning it off would destroy? */
  const holds = useCallback(
    (mode: Mode) =>
      (mode === "photo" && photos.length > 0) ||
      (mode === "voice" && recordings.length > 0),
    [photos.length, recordings.length],
  );

  /**
   * Throw away everything in a section and put it out.
   *
   * Destructive and final — the blobs are held nowhere else. Call it only once
   * the person has confirmed; `holds` is how a caller knows to ask.
   */
  const discard = useCallback((mode: Mode) => {
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
    setActive((current) => {
      const next = new Set(current);
      next.delete(mode);
      return next;
    });
  }, []);

  /**
   * Light a section, or put out one that holds nothing.
   *
   * When the section does hold something this is a no-op: destroying it is
   * `discard`'s job, and the caller is expected to have checked `holds` and
   * asked. "Text" carries no object URLs, so turning it off only hides the
   * field — the caller clears the form value itself, since the text lives in
   * react-hook-form rather than here.
   */
  const toggle = useCallback(
    (mode: Mode) => {
      if (holds(mode)) return;
      setActive((current) => {
        const next = new Set(current);
        if (next.has(mode)) next.delete(mode);
        else next.add(mode);
        return next;
      });
    },
    [holds],
  );

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
    holds,
    toggle,
    discard,
    photos,
    addPhotos,
    removePhoto,
    recordings,
    addRecording,
    removeRecording,
    reset,
  };
}
