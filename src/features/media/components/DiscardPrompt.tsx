"use client";

import { Button } from "@/components/ui/button";
import type { Mode } from "@/features/media/useAttachments";

/**
 * "Remove the three photographs you added?"
 *
 * Turning a section off throws away what was in it, and the files exist nowhere
 * else — nothing is uploaded until Save. That used to happen on one tap of the
 * tile. This is the tap in between.
 *
 * It is the same two-tap shape as `ExistingAssetControls` in `MemoryEditor`,
 * deliberately: that one guards deleting a file the backend still has, and this
 * one guards a recording that only exists in this tab. The unrecoverable case
 * should not be the one that is easier to trigger.
 *
 * A native `confirm()` would have been fewer lines and is the wrong register for
 * a product that reads as a printed object.
 */
export function DiscardPrompt({
  mode,
  count,
  onKeep,
  onRemove,
  disabled,
}: {
  mode: Extract<Mode, "photo" | "voice">;
  count: number;
  onKeep: () => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const noun =
    mode === "photo"
      ? count === 1
        ? "photograph"
        : "photographs"
      : count === 1
        ? "recording"
        : "recordings";

  return (
    <div
      role="alertdialog"
      aria-label={`Remove the ${noun}?`}
      className="space-y-2"
    >
      <p className="font-sans text-sm leading-relaxed text-seal">
        Remove the {count} {noun} you added? They are not saved anywhere yet.
      </p>
      <span className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onKeep}
          disabled={disabled}
        >
          Keep them
        </Button>
        <Button type="button" size="sm" onClick={onRemove} disabled={disabled}>
          Remove
        </Button>
      </span>
    </div>
  );
}
