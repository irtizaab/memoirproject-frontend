"use client";

import type { Transcript } from "@/features/media/schemas";

/**
 * The words in a recording, folded away under the player.
 *
 * Four states, each worth something different:
 *
 *  - **still working** — one quiet line. Not a spinner and not a percentage;
 *    the audio above it already plays, so nothing is actually blocked.
 *  - **done** — a `View transcript` disclosure, **closed by default**. A memoir
 *    with twenty recordings would otherwise be a grid of enormous cards, and
 *    the archive stops being something you can scan.
 *  - **skipped** — said plainly. This is a decision the product made about
 *    somebody's money, and hiding it would leave them wondering why one
 *    recording has words and another does not.
 *  - **failed** — *nothing at all.* A family does not need to be told a machine
 *    struggled with their grandmother's accent, and the recording itself is
 *    completely unaffected. An error here points at a problem that is not
 *    theirs and cannot be acted on.
 *
 * Built on `<details>`/`<summary>` rather than a `useState` toggle: it is
 * keyboard-operable, screen-reader-announced and findable by the browser's own
 * in-page search, all without a line of JavaScript.
 */
export function TranscriptReader({
  transcript,
}: {
  transcript: Transcript | null;
}) {
  if (!transcript) return null;

  if (transcript.status === "queued" || transcript.status === "processing") {
    return (
      <p
        className="font-sans text-xs text-ink-faint italic"
        role="status"
        aria-live="polite"
      >
        Transcribing this recording…
      </p>
    );
  }

  if (transcript.status === "skipped") {
    return (
      <p className="font-sans text-xs text-ink-faint italic">
        Not transcribed — this memoir has used its transcription allowance.
      </p>
    );
  }

  if (transcript.status !== "done") return null;

  const paragraphs =
    transcript.segments && transcript.segments.length > 0
      ? transcript.segments.map((segment) => segment.text)
      : transcript.text
        ? [transcript.text]
        : [];

  if (paragraphs.length === 0) return null;

  return (
    <details className="group">
      <summary className="eyebrow-muted cursor-pointer list-none select-none hover:text-ink-soft">
        <span aria-hidden className="mr-1 inline-block group-open:hidden">
          ▸
        </span>
        <span aria-hidden className="mr-1 hidden group-open:inline-block">
          ▾
        </span>
        <span className="group-open:hidden">View transcript</span>
        <span className="hidden group-open:inline">Hide transcript</span>
      </summary>

      <div className="mt-3 space-y-2 border-l-2 border-rule pl-4">
        {paragraphs.map((paragraph, index) => (
          <p
            // Index as the key: these are paragraphs of one immutable
            // transcript, never reordered, inserted into, or removed.
            key={index}
            className="font-sans text-sm leading-relaxed text-muted-foreground"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </details>
  );
}
