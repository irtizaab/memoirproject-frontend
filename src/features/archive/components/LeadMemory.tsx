"use client";

import Link from "next/link";
import { Calendar, ImageIcon, Mic } from "lucide-react";

import type { Memory } from "@/features/archive/schemas";
import { formatHappenedOn, labelForKind } from "@/features/archive/utils";

/** Long enough to be prose rather than a caption. */
const EXCERPT_LENGTH = 260;

function excerpt(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= EXCERPT_LENGTH) return clean;
  return `${clean.slice(0, clean.lastIndexOf(" ", EXCERPT_LENGTH))}…`;
}

/**
 * The newest memory, set at reading size.
 *
 * The archive used to open with a three-up grid of tiles, which asks a person
 * to scan twelve things and read none of them. This is the same card the grid
 * uses, given the room to be read: the photograph on one side, and on the other
 * the title at 27px and the writing at 17px Spectral — the register of what
 * somebody actually wrote, rather than the 14px sans the interface uses to talk
 * about itself.
 *
 * It is still a **summary**. Every photograph, every player, the whole text and
 * delete all live at `/archive/[memoryId]`; this shows enough to recognise a
 * memory by and links there, like every other card.
 */
export function LeadMemory({ memory }: { memory: Memory }) {
  const photos = memory.assets.filter(
    (asset) => asset.kind === "image" && asset.url,
  );
  const recordings = memory.assets.filter((asset) => asset.kind === "audio");
  const [lead] = photos;
  const happenedOn = formatHappenedOn(memory.happened_on);

  return (
    <Link
      href={`/archive/${memory.id}`}
      className="group grid overflow-hidden rounded-2xl border border-border bg-card shadow-lift transition-colors hover:border-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:grid-cols-[minmax(0,420px)_minmax(0,1fr)]"
    >
      {lead && (
        /* A signed, expiring URL from a private bucket. `next/image` cannot
           fetch it, and anything it cached would outlive the signature. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lead.url ?? ""}
          alt={memory.title ?? "A photograph from this memoir"}
          className="h-56 w-full bg-paper-deep object-cover sm:h-full sm:min-h-[290px]"
        />
      )}

      <div className="flex flex-col p-8">
        <div className="flex items-baseline justify-between gap-3">
          <p className="eyebrow">{labelForKind(memory.kind)}</p>
          {happenedOn && <p className="eyebrow-muted">{happenedOn}</p>}
        </div>

        {memory.title && (
          <h3 className="mt-3.5 font-heading text-[27px] leading-snug font-normal tracking-tight text-balance group-hover:text-seal">
            {memory.title}
          </h3>
        )}

        {memory.body_text && (
          <p className="mt-3.5 font-heading text-[17px] leading-[1.7] font-light">
            {excerpt(memory.body_text)}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <span className="font-sans text-xs text-muted-foreground">
            {memory.is_owner ? (
              "You"
            ) : (
              <>
                {memory.contributor_name}
                <span className="text-ink-faint"> &middot; sent in</span>
              </>
            )}
          </span>

          {/*
            What is inside, counted rather than rendered — four players loading
            on a page somebody is passing through is the bug the summary exists
            to avoid.
          */}
          <span className="flex flex-wrap items-center gap-4 font-sans text-xs text-ink-faint">
            {recordings.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Mic aria-hidden className="size-3.5" />
                {recordings.length}{" "}
                {recordings.length === 1 ? "recording" : "recordings"}
              </span>
            )}
            {photos.length > 0 && (
              <span className="flex items-center gap-1.5">
                <ImageIcon aria-hidden className="size-3.5" />
                {photos.length}{" "}
                {photos.length === 1 ? "photograph" : "photographs"}
              </span>
            )}
            {happenedOn && (
              <span className="flex items-center gap-1.5">
                <Calendar aria-hidden className="size-3.5" />
                {memory.happened_on?.slice(0, 4)}
              </span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
