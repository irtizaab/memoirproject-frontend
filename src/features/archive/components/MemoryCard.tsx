"use client";

import Link from "next/link";
import { ImageIcon, Mic } from "lucide-react";

import type { Memory } from "@/features/archive/schemas";
import { formatHappenedOn, labelForKind } from "@/features/archive/utils";

/** Roughly three lines of prose. Enough to recognise a memory by. */
const EXCERPT_LENGTH = 160;

function excerpt(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= EXCERPT_LENGTH) return clean;
  // Cut at a word, not mid-syllable.
  return `${clean.slice(0, clean.lastIndexOf(" ", EXCERPT_LENGTH))}…`;
}

/**
 * One memory in the archive grid — a **summary**, not the thing itself.
 *
 * The card used to render everything: every photograph, a player and a
 * transcript per recording, the full text. Twelve of those is not a grid you
 * can look across, it is a wall you scroll past. Worse, a memoir's worth of
 * signed media URLs were all being fetched at once to build a page nobody was
 * reading in full.
 *
 * So the card shows enough to recognise a memory by — one image, what it holds,
 * the opening of what was written — and the whole thing lives at
 * `/archive/[memoryId]`. Delete moved there too: it belongs beside the thing it
 * destroys, not on a tile you might mis-tap while scanning.
 *
 * A `<Link>` wrapping the card, not an onClick: middle-click, open-in-new-tab
 * and the browser's own status bar all work, and none of them would with a div.
 */
export function MemoryCard({ memory }: { memory: Memory }) {
  const photos = memory.assets.filter(
    (asset) => asset.kind === "image" && asset.url,
  );
  const recordings = memory.assets.filter((asset) => asset.kind === "audio");
  const [lead] = photos;
  const happenedOn = formatHappenedOn(memory.happened_on);

  return (
    <Link
      href={`/archive/${memory.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-paper-deep transition-colors hover:border-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {lead && (
        /* A signed, expiring URL from a private bucket. `next/image` cannot
           fetch it, and anything it cached would outlive the signature. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lead.url ?? ""}
          alt={memory.title ?? "A photograph from this memoir"}
          className="h-44 w-full object-cover"
        />
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="eyebrow">{labelForKind(memory.kind)}</p>

        {happenedOn && <p className="eyebrow-muted">{happenedOn}</p>}

        {memory.title && (
          <h3 className="font-heading text-xl leading-snug font-normal text-balance group-hover:text-seal">
            {memory.title}
          </h3>
        )}

        {memory.body_text && (
          <p className="font-sans text-sm leading-relaxed text-muted-foreground">
            {excerpt(memory.body_text)}
          </p>
        )}

        {/*
          What is inside, counted rather than rendered. A person scanning the
          archive wants to know a memory has her voice in it; they do not want
          four players loading on a page they are passing through.
        */}
        {(recordings.length > 0 || photos.length > 0) && (
          <ul className="flex flex-wrap items-center gap-4 text-ink-faint">
            {recordings.length > 0 && (
              <li className="flex items-center gap-1.5 font-sans text-xs">
                <Mic aria-hidden className="size-3.5" />
                {recordings.length}{" "}
                {recordings.length === 1 ? "recording" : "recordings"}
              </li>
            )}
            {photos.length > 0 && (
              <li className="flex items-center gap-1.5 font-sans text-xs">
                <ImageIcon aria-hidden className="size-3.5" />
                {photos.length}{" "}
                {photos.length === 1 ? "photograph" : "photographs"}
              </li>
            )}
          </ul>
        )}

        {/*
          Whose memory this is, and whether it came from somebody else.

          The owner's own entries read "You" rather than their own name, which
          is what a person expects to see above something they wrote. A
          contribution keeps its sender's name and is marked as sent, so the
          two are distinguishable at a glance without a badge — the thing that
          matters when reviewing what has arrived.

          `is_owner`, not a name comparison: a contributor who types the
          owner's name is still a contributor.
        */}
        <p className="mt-auto pt-2 font-sans text-xs text-ink-faint">
          {memory.is_owner ? (
            "You"
          ) : (
            <>
              {memory.contributor_name}
              <span className="text-ink-faint"> · sent in</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}
