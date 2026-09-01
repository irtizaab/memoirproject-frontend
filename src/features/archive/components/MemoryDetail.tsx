"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { useActiveMemoir } from "@/features/account";
import { useDeleteMemory, useMemory } from "@/features/archive/hooks";
import { formatHappenedOn, labelForKind } from "@/features/archive/utils";
import { TranscriptReader } from "@/features/media";
import { isApiError } from "@/lib/api/errors";

/**
 * One memory, in full — the page a card drills into.
 *
 * Everything the grid deliberately withholds lives here: every photograph at a
 * size worth looking at, a player and a transcript for each recording, the
 * whole of what was written, and the delete control.
 *
 * Delete sits on this page rather than on the tile because it destroys somebody
 * else's recording of somebody else's grandmother. Making it reachable only
 * from the memory itself means nobody arrives at it by mis-tapping while
 * scrolling.
 */
export function MemoryDetail({ memoryId }: { memoryId: string }) {
  const router = useRouter();
  const { memoir } = useActiveMemoir();
  const { data: memory, isPending, error } = useMemory(memoir?.id ?? null, memoryId);
  const remove = useDeleteMemory(memoir?.id ?? null);

  const [confirming, setConfirming] = useState(false);

  if (isPending && !memory) {
    return (
      <p className="font-sans text-sm text-ink-faint">Opening this memory…</p>
    );
  }

  // 404 covers "no such memory" and "not yours" alike; neither is worth
  // distinguishing to the person reading, and the backend does not either.
  if (error || !memory) {
    const missing = isApiError(error) && error.status === 404;
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Archive"
          title={missing ? "That memory is not here." : "That could not be opened."}
          description={
            missing
              ? "It may have been deleted, or the link may belong to a different archive."
              : "Something went wrong reaching the archive. Trying again usually settles it."
          }
        />
        <Link href="/archive" className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft aria-hidden />
          Back to the archive
        </Link>
      </div>
    );
  }

  const photos = memory.assets.filter(
    (asset) => asset.kind === "image" && asset.url,
  );
  const recordings = memory.assets.filter((asset) => asset.kind === "audio");
  const happenedOn = formatHappenedOn(memory.happened_on);

  return (
    <div className="space-y-10">
      <Link
        href="/archive"
        className="inline-flex items-center gap-2 font-sans text-sm text-ink-soft transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" />
        The archive
      </Link>

      <PageHeader
        eyebrow={labelForKind(memory.kind)}
        title={memory.title ?? "An untitled memory"}
        description={
          <>
            {happenedOn && <span className="block">{happenedOn}</span>}
            <span className="mt-1 block text-ink-faint">
              Added by {memory.contributor_name}
            </span>
          </>
        }
      />

      {recordings.length > 0 && (
        <section className="space-y-6">
          <h2 className="font-heading text-xl font-normal">
            {recordings.length === 1 ? "The recording" : "The recordings"}
          </h2>
          <ul className="space-y-6">
            {recordings.map((asset) => (
              <li
                key={asset.id}
                className="space-y-3 rounded-lg border border-border bg-paper-deep p-5"
              >
                {/* No caption track. A transcript is not captions: it is not
                    timed to the audio the way a <track> expects, and it reads
                    below as prose somebody can actually follow. */}
                <audio controls src={asset.url ?? ""} className="w-full" />
                <TranscriptReader transcript={asset.transcript} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {memory.body_text && (
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-normal">
            What was written
          </h2>
          {/* Paragraphs preserved. Somebody's account of an afternoon has
              breaks in it, and rendering it as one block loses them. */}
          <div className="space-y-4">
            {memory.body_text
              .split(/\n{2,}/)
              .map((paragraph) => paragraph.trim())
              .filter(Boolean)
              .map((paragraph, index) => (
                <p
                  key={index}
                  className="font-sans leading-relaxed whitespace-pre-line text-foreground"
                >
                  {paragraph}
                </p>
              ))}
          </div>
        </section>
      )}

      {photos.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-normal">
            {photos.length === 1 ? "The photograph" : "The photographs"}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {photos.map((asset) => (
              <li key={asset.id}>
                {/* A signed, expiring URL from a private bucket. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.url ?? ""}
                  alt="A photograph from this memory"
                  className="w-full rounded-lg border border-border object-contain"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        {confirming ? (
          <>
            <p className="font-sans text-sm text-seal">
              Delete this permanently? Its recordings and photographs go with it.
            </p>
            <span className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={remove.isPending}
              >
                Keep it
              </Button>
              <Button
                variant="default"
                onClick={() =>
                  remove.mutate(memory.id, {
                    onSuccess: () => router.push("/archive"),
                  })
                }
                disabled={remove.isPending}
              >
                {remove.isPending ? "Deleting…" : "Delete"}
              </Button>
            </span>
          </>
        ) : (
          <>
            <p className="font-heading text-sm italic text-ink-soft">
              A memoir is not a perfect record. It is a generous one.
            </p>
            <Button variant="destructive" onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden />
              Delete this memory
            </Button>
          </>
        )}
      </section>

      {remove.error && (
        <p role="alert" className="font-sans text-sm text-seal">
          That memory could not be deleted. {remove.error.message}
        </p>
      )}
    </div>
  );
}
