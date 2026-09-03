"use client";

import styles from "@/features/memoir/reader.module.css";
import type { Block, BlockSource } from "@/features/memoir/schemas";
import { credit } from "@/features/memoir/utils";
import { cn } from "@/lib/utils";

/**
 * The inner margin: photographs and credits, anchored to the paragraph each
 * belongs to.
 *
 * This lane is the book's apparatus and it is sealed when the memoir is. It is
 * kept apart from the comment lane for that reason — the two have different
 * lifespans, and a conversation that grows for a decade must not push a
 * photograph away from the sentence that earned it.
 */

/** A photograph in the margin, at its caption's own words. */
export function MarginPlate({ block }: { block: Block }) {
  const figure = block.figure;
  if (!figure) return null;

  return (
    <figure className="m-0">
      <MarginHead>
        {figure.year ? `Artifact · ${figure.year}` : "Artifact"}
      </MarginHead>

      {figure.url ? (
        /* A signed, expiring URL from a private bucket. `next/image` cannot
           fetch it, and anything it cached would outlive the signature. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={figure.url}
          alt={figure.caption ?? "A photograph from this memoir"}
          className="w-full border border-border object-cover"
        />
      ) : (
        /* Storage could not sign it. A gap, not a broken page — and no error
           text, because a family cannot act on it and the photograph is fine. */
        <div className="aspect-4/5 w-full border border-border bg-paper-deep" />
      )}

      {(figure.caption || figure.credit) && (
        <figcaption className="mt-2.5 font-sans text-[9.5px] leading-relaxed font-medium tracking-[0.14em] text-ink-faint uppercase">
          {figure.caption}
          {figure.credit && (
            <>
              {figure.caption && <br />}
              Given by {figure.credit}
            </>
          )}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Who this paragraph was assembled from.
 *
 * One compact line each, so a paragraph drawn from four people costs four
 * lines of margin rather than four cards. Hovering one underlines the exact
 * words it fathered in the prose — which is the whole argument for storing
 * offsets rather than a footnote number.
 */
export function SourceCredits({
  sources,
  paragraphNumber,
  litSourceId,
  onLight,
}: {
  sources: BlockSource[];
  paragraphNumber: number | null;
  litSourceId: string | null;
  onLight: (id: string | null) => void;
}) {
  if (sources.length === 0) return null;

  const diverging = sources.some((source) => source.diverges);

  return (
    <div>
      <MarginHead lit={sources.some((s) => s.id === litSourceId)}>
        {paragraphNumber ? `Sources · ¶${paragraphNumber}` : "Sources"}
        {/*
          Two people remembered this differently and both were kept. Said in
          words in the margin head, because it is a fact about the paragraph
          rather than a warning about it.
        */}
        {diverging && " — two accounts"}
      </MarginHead>

      <ul className="border-t border-border">
        {sources.map((source) => (
          <li key={source.id}>
            <button
              type="button"
              onMouseEnter={() => onLight(source.id)}
              onMouseLeave={() => onLight(null)}
              onFocus={() => onLight(source.id)}
              onBlur={() => onLight(null)}
              className="block w-full border-b border-border py-1.5 text-left"
            >
              <span
                className={cn(
                  "block font-heading text-sm leading-snug font-light transition-colors",
                  litSourceId === source.id
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {source.name}
              </span>
              <span
                className={cn(
                  "mt-0.5 block font-sans text-[9.5px] font-medium tracking-[0.14em] uppercase transition-colors",
                  litSourceId === source.id ? "text-seal" : "text-ink-faint",
                )}
              >
                {credit(source)}
                {source.diverges && " · differs"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The hairline-and-label that opens every object in this lane. */
function MarginHead({
  children,
  lit,
}: {
  children: React.ReactNode;
  lit?: boolean;
}) {
  return (
    <p
      className={cn(
        "mb-2.5 flex items-center gap-2 font-sans text-[9.5px] font-medium tracking-[0.18em] uppercase transition-colors",
        lit ? "text-seal" : "text-ink-faint",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-px w-3.5 shrink-0 transition-colors",
          lit ? "bg-seal" : "bg-rule",
        )}
      />
      {children}
    </p>
  );
}

/**
 * A recording in the margin.
 *
 * The waveform is decorative — drawn in CSS rather than sampled from the audio,
 * because a real waveform would mean downloading every recording in a chapter
 * to draw a picture of it. What is true is beside it: whose voice, when, and
 * how long.
 */
export function VoiceCredit({ source }: { source: BlockSource }) {
  return (
    <div>
      <MarginHead>In {source.name.split(" ")[0]}&apos;s voice</MarginHead>
      <div aria-hidden className={styles.wave} />
      <p className="mt-2 font-sans text-[9.5px] font-medium tracking-[0.13em] text-ink-faint uppercase">
        {credit(source)}
      </p>
    </div>
  );
}
