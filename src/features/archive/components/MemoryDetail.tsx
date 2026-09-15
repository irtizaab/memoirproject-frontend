"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { PageBody } from "@/components/layout/PageBody";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { useActiveMemoir } from "@/features/account";
import {
  useMemories,
  useDeleteMemory,
  useMemory,
} from "@/features/archive/hooks";
import {
  formatHappenedOn,
  labelForKind,
  tellerLine,
} from "@/features/archive/utils";
import { TranscriptReader, formatDuration } from "@/features/media";
import { isApiError } from "@/lib/api/errors";

/**
 * One memory, as a document rather than a page of panels.
 *
 * The prose used to be 16px sans, third on the page, behind two collapsed
 * disclosure summaries — so the thing somebody wrote about their father was the
 * hardest thing on the screen to read. It is now one 680px sheet with a printed
 * byline, the words at 19px Spectral, and photographs as captioned figures in
 * the flow. Everything that *acts* on the memory sits in a toolbar above the
 * sheet, so nothing operable is mixed in with what is meant to be read.
 *
 * Delete sits on this page rather than on the tile because it destroys somebody
 * else's recording of somebody else's grandmother. Making it reachable only
 * from the memory itself means nobody arrives at it by mis-tapping while
 * scrolling.
 */
export function MemoryDetail({ memoryId }: { memoryId: string }) {
  const router = useRouter();
  const { memoir } = useActiveMemoir();
  const {
    data: memory,
    isPending,
    error,
  } = useMemory(memoir?.id ?? null, memoryId);
  const { data: memories } = useMemories(memoir?.id ?? null);
  const remove = useDeleteMemory(memoir?.id ?? null);

  const [confirming, setConfirming] = useState(false);

  if (isPending && !memory) {
    return (
      <PageBody>
        <p className="font-sans text-sm text-ink-faint">Opening this memory…</p>
      </PageBody>
    );
  }

  // 404 covers "no such memory" and "not yours" alike; neither is worth
  // distinguishing to the person reading, and the backend does not either.
  if (error || !memory) {
    const missing = isApiError(error) && error.status === 404;
    return (
      <>
        <PageHeader
          eyebrow="Archive"
          title={
            missing ? "That memory is not here." : "That could not be opened."
          }
          description={
            missing
              ? "It may have been deleted, or the link may belong to a different archive."
              : "Something went wrong reaching the archive. Trying again usually settles it."
          }
        />
        <PageBody>
          <Link
            href="/archive"
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeft aria-hidden />
            Back to the archive
          </Link>
        </PageBody>
      </>
    );
  }

  const photos = memory.assets.filter(
    (asset) => asset.kind === "image" && asset.url,
  );
  const recordings = memory.assets.filter((asset) => asset.kind === "audio");
  const [plate, ...moreRecordings] = recordings;
  const [figure, ...moreFigures] = photos;
  const happenedOn = formatHappenedOn(memory.happened_on);

  /*
    Where this sits in the archive, and what is either side of it. Both come
    from the list the archive already holds — no new endpoint — and both are
    absent while it is still loading rather than guessed at.
  */
  const index = memories?.findIndex((one) => one.id === memory.id) ?? -1;
  const previous = index > 0 ? memories?.[index - 1] : undefined;
  const next = index >= 0 && memories ? memories[index + 1] : undefined;

  return (
    <>
      {/* The toolbar. Everything that acts on the memory, above the memory. */}
      <div className="border-b border-border bg-paper-deep">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3.5">
          <Link
            href="/archive"
            className="inline-flex items-center gap-2 font-sans text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            The archive
          </Link>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {index >= 0 && memories && (
              <span className="font-sans text-xs text-ink-faint">
                Memory {index + 1} of {memories.length}
              </span>
            )}
            <Link
              href={`/archive/${memory.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil aria-hidden />
              Edit
            </Link>
            {/*
              Delete is a text control beside an outlined one, not a second
              button of equal weight. Editing is the ordinary thing to want
              here; this is not, and the two should not look like a pair.
            */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirming(true)}
            >
              <Trash2 aria-hidden />
              Delete
            </Button>
          </div>
        </div>

        {confirming && (
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-3.5">
            <p className="font-sans text-sm text-seal">
              Delete this permanently? Its recordings and photographs go with
              it.
            </p>
            <span className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirming(false)}
                disabled={remove.isPending}
              >
                Keep it
              </Button>
              <Button
                size="sm"
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
          </div>
        )}
      </div>

      <PageBody className="md:py-14">
        {/* One sheet, 680px of measure. A page in a book, not a workspace. */}
        <article className="mx-auto max-w-[680px] rounded-2xl border border-border bg-card px-7 pt-11 pb-10 shadow-lift sm:px-[60px] sm:pt-[52px] sm:pb-[46px]">
          <header className="text-center">
            <span
              aria-hidden
              className="mx-auto block size-1.5 rotate-45 bg-seal"
            />
            <p className="eyebrow mt-5">
              {labelForKind(memory.kind)}
              {happenedOn && ` · ${happenedOn}`}
            </p>
            <h1 className="mt-3.5 font-heading text-[clamp(26px,4vw,33px)] leading-tight font-normal tracking-tight text-balance">
              {memory.title ?? "An untitled memory"}
            </h1>
            <p className="mt-4 font-heading text-base font-light italic text-muted-foreground">
              {memory.is_owner ? (
                "as told by you"
              ) : (
                <>
                  as told by{" "}
                  <Link
                    href={`/contributors/${memory.participant_id}`}
                    className="underline decoration-rule underline-offset-4 hover:text-seal"
                  >
                    {tellerLine(memory)}
                  </Link>
                </>
              )}
            </p>
            <span
              aria-hidden
              className="mx-auto mt-7 block h-px w-[120px] bg-rule"
            />
          </header>

          {/* The prose, at reading size, before anything else. */}
          {memory.body_text && (
            <div className="mt-9 font-heading text-[19px] leading-[1.72] font-light">
              {/* Paragraphs preserved. Somebody's account of an afternoon has
                  breaks in it, and rendering it as one block loses them. */}
              {memory.body_text
                .split(/\n{2,}/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p
                    key={i}
                    className={`whitespace-pre-line ${i > 0 ? "mt-5" : ""}`}
                  >
                    {paragraph}
                  </p>
                ))}
            </div>
          )}

          {/* Photographs as figures in the flow, the first one full width. */}
          {figure && (
            <figure className="mt-10">
              {/* A signed, expiring URL from a private bucket. `next/image`
                  cannot fetch it, and anything it cached would outlive the
                  signature. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={figure.url ?? ""}
                alt="A photograph from this memory"
                className="w-full border border-border bg-paper-deep object-cover"
              />
              <figcaption className="mt-3 flex flex-wrap justify-between gap-x-5 gap-y-1 font-sans text-[9.5px] leading-relaxed font-medium tracking-[0.14em] text-ink-faint uppercase">
                <span>
                  {photos.length === 1
                    ? "A photograph from this memory"
                    : `1 of ${photos.length} photographs`}
                </span>
                <span className="whitespace-nowrap">
                  Given by {memory.is_owner ? "you" : memory.contributor_name}
                </span>
              </figcaption>
            </figure>
          )}

          {moreFigures.length > 0 && (
            <ul className="mt-3.5 grid grid-cols-2 gap-3.5">
              {moreFigures.map((asset) => (
                <li key={asset.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.url ?? ""}
                    alt="A photograph from this memory"
                    className="h-full w-full border border-border bg-paper-deep object-cover"
                  />
                </li>
              ))}
            </ul>
          )}

          {/* The recording, as a plate with its transcript beneath. */}
          {plate && (
            <section className="mt-10 border-t border-border pt-7">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h2 className="font-heading text-[19px] font-normal">
                  {memory.is_owner ? "In your own voice" : "In their own voice"}
                </h2>
                {formatDuration(plate.duration_ms) && (
                  <span className="eyebrow-muted">
                    {formatDuration(plate.duration_ms)}
                  </span>
                )}
              </div>
              {/* No caption track. A transcript is not captions: it is not
                  timed to the audio the way a <track> expects, and it reads
                  below as prose somebody can actually follow. */}
              <audio
                controls
                src={plate.url ?? ""}
                className="mt-4 w-full border border-border bg-paper-deep p-2.5"
              />
              <div className="mt-4">
                <TranscriptReader transcript={plate.transcript} />
              </div>
            </section>
          )}

          {moreRecordings.length > 0 && (
            <ul className="mt-6 space-y-6 border-t border-border pt-6">
              {moreRecordings.map((asset) => (
                <li key={asset.id} className="space-y-3">
                  <audio
                    controls
                    src={asset.url ?? ""}
                    className="w-full border border-border bg-paper-deep p-2.5"
                  />
                  <TranscriptReader transcript={asset.transcript} />
                </li>
              ))}
            </ul>
          )}

          <footer className="mt-11 flex flex-wrap items-baseline justify-between gap-4 border-t border-border pt-5 font-sans text-xs text-ink-faint">
            <span>
              Arrived{" "}
              {new Date(memory.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
              })}
            </span>
            {!memory.is_owner && (
              <Link
                href={`/contributors/${memory.participant_id}`}
                className="border-b border-border pb-0.5 text-muted-foreground transition-colors hover:text-seal"
              >
                Everything {memory.contributor_name.split(" ")[0]} has left
              </Link>
            )}
          </footer>
        </article>

        {(previous || next) && (
          <nav className="mx-auto mt-8 flex max-w-[680px] flex-wrap items-baseline justify-between gap-5 font-sans text-[12.5px] text-muted-foreground">
            {previous ? (
              <Link
                href={`/archive/${previous.id}`}
                className="transition-colors hover:text-seal"
              >
                ← {previous.title ?? "An untitled memory"}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/archive/${next.id}`}
                className="text-right transition-colors hover:text-seal"
              >
                {next.title ?? "An untitled memory"} →
              </Link>
            )}
          </nav>
        )}

        {remove.error && (
          <p role="alert" className="mt-6 font-sans text-sm text-seal">
            That memory could not be deleted. {remove.error.message}
          </p>
        )}
      </PageBody>
    </>
  );
}
