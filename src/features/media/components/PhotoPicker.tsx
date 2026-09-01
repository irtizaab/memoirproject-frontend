"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Choose a photograph, see it, and change your mind.
 *
 * Two decisions worth knowing about:
 *
 * **It downscales before uploading.** A photo straight off a modern phone is
 * 4000px wide and several megabytes; nothing in this product displays it above
 * 2000px. Shrinking in the browser turns a slow upload on a phone connection
 * into a fast one, and keeps a family's 10 GB from being spent on pixels
 * nobody sees. The original is not kept — a deliberate trade, and the reason
 * the cap is generous rather than thumbnail-sized.
 *
 * **HEIC is passed through untouched.** iPhones shoot it, `canvas` cannot
 * decode it, and a failed downscale must not become a failed upload. Storage
 * takes it as-is.
 *
 * **It takes several at once.** An afternoon is rarely one photograph, and a
 * memory holds writing, pictures and recordings together — so this is a list,
 * and each entry can be removed on its own.
 */

/** Longest edge, in pixels, after downscaling. */
const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.85;

/** What the browser cannot draw to a canvas, so must not try to shrink. */
function isUnshrinkable(file: File): boolean {
  const type = file.type.toLowerCase();
  return type.includes("heic") || type.includes("heif") || type === "";
}

async function downscale(file: File): Promise<Blob> {
  if (isUnshrinkable(file)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

    // Already small enough. Re-encoding would only lose quality.
    if (scale === 1) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    return blob ?? file;
  } catch {
    // Any failure to shrink falls back to the original. A photograph that
    // uploads slowly is a far better outcome than one that does not upload.
    return file;
  }
}

export type Photo = {
  blob: Blob;
  filename: string;
  /** Object URL for the preview. Revoked when the photo is cleared. */
  previewUrl: string;
};

export function PhotoPicker({
  photos,
  onPicked,
  onRemoved,
  disabled,
}: {
  photos: Photo[];
  /** Called with everything just chosen, already downscaled. */
  onPicked: (photos: Photo[]) => void;
  /** Removes one by index. The caller revokes its preview URL. */
  onRemoved: (index: number) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setIsPreparing(true);
    // In parallel: shrinking is CPU-bound per image but `createImageBitmap`
    // and `toBlob` both yield, so ten photographs finish in roughly the time
    // the slowest one takes rather than the sum of all ten.
    const prepared = await Promise.all(
      files.map(async (file) => {
        const blob = await downscale(file);
        return {
          blob,
          filename: file.name,
          previewUrl: URL.createObjectURL(blob),
        };
      }),
    );
    setIsPreparing(false);

    onPicked(prepared);

    // Cleared so choosing the same file twice in a row still fires `change`.
    event.target.value = "";
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={handleChange}
        className="sr-only"
      />

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li
              key={photo.previewUrl}
              className="space-y-2 rounded-lg border border-border bg-paper-deep p-2"
            >
              {/* A blob: URL for a file just chosen — nothing for the image
                  optimizer to fetch or cache. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt={photo.filename}
                className="h-32 w-full rounded object-cover"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-sans text-xs text-muted-foreground">
                  {photo.filename}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoved(index)}
                  disabled={disabled}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-paper-deep p-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isPreparing}
        >
          {isPreparing
            ? "Preparing…"
            : photos.length > 0
              ? "Add more photographs"
              : "Choose photographs"}
        </Button>
        <p className="font-sans text-sm text-muted-foreground">
          {photos.length > 0
            ? `${photos.length} chosen. Keep the images and their context together.`
            : "Keep the image and its context together."}
        </p>
      </div>
    </div>
  );
}
