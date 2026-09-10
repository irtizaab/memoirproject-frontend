"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Download, Loader2, Lock, Sparkles } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MemoirSummary } from "@/features/account";
import {
  useAssembleMemoir,
  useExportMemoir,
  usePublishMemoir,
} from "@/features/archive/hooks";
import {
  publishFormSchema,
  type PublishFormValues,
} from "@/features/archive/schemas";
import { useTransientLabel } from "@/hooks/useTransientLabel";

/**
 * What becomes of the archive: the book, and the ways out of it.
 *
 * It sits under a hairline in the archive's opening band, directly below the
 * book cover and the line the owner wrote — so the band answers, in order, who
 * the book is for and what state it is in. It carries no card of its own for
 * that reason: a raised sheet inside a band would be a second surface where the
 * band already is one.
 *
 * It is the only place in the signed-in app that points at `/m/[token]`, and
 * the only place a memoir can be sealed.
 *
 * ---------------------------------------------------------------------------
 * Nothing here appears before there is something to point at
 * ---------------------------------------------------------------------------
 * "View the memoir" and "Export a PDF" are absent — not disabled — until
 * `chapter_count` is above zero. A disabled button is a promise with a reason
 * the person has to guess at; an absent one is answered by the sentence beside
 * it, which says what to do instead.
 *
 * There is no progress indicator, no percentage and no "your memoir is 40%
 * complete". The archive README forbids it and this is the screen most tempted
 * by it: assembly produces four numbers, and they are facts about what the
 * archive turned into rather than a score against a total nobody has.
 */
export function BookPanel({ memoir }: { memoir: MemoirSummary | null }) {
  const memoirId = memoir?.id ?? null;
  const assembled = (memoir?.chapter_count ?? 0) > 0;
  const published = Boolean(memoir?.published_at);

  const assemble = useAssembleMemoir(memoirId);
  const publish = usePublishMemoir(memoirId);
  const exportPdf = useExportMemoir(memoirId);

  const [showPassphrase, setShowPassphrase] = useState(false);
  const [copyLabel, showCopyLabel] = useTransientLabel("Copy the reading link");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PublishFormValues>({
    resolver: zodResolver(publishFormSchema),
    defaultValues: { passphrase: "" },
  });

  const readingUrl =
    memoir?.view_token && typeof window !== "undefined"
      ? `${window.location.origin}/m/${memoir.view_token}`
      : null;

  const copyLink = () => {
    if (!readingUrl) return;
    const done = () => showCopyLabel("Link copied", 1800);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(readingUrl).then(done, done);
    } else {
      done();
    }
  };

  return (
    <section className="pt-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-[52ch]">
          <h2 className="font-heading text-xl leading-snug font-normal">
            {assembled
              ? published
                ? "Sealed, and open to read"
                : "Assembled, not yet sealed"
              : "Nothing has been assembled yet"}
          </h2>
          <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
            {assembled
              ? published
                ? "Anyone with the link and the passphrase can read it. Nothing in it can change; what they add to the margins can."
                : "Read it through before sealing it. Assembling again rebuilds it from everything in the archive, including whatever arrived since."
              : "Assembling gathers every memory, recording and photograph into chapters, in the order they were lived."}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {assembled && memoir?.view_token && (
            <a
              href={`/m/${memoir.view_token}`}
              className={buttonVariants({ variant: "outline" })}
            >
              <BookOpen aria-hidden className="size-4" />
              View the memoir
            </a>
          )}

          {assembled && (
            <Button
              variant="outline"
              onClick={() => exportPdf.mutate()}
              disabled={exportPdf.isPending}
            >
              {exportPdf.isPending ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <Download aria-hidden className="size-4" />
              )}
              {exportPdf.isPending ? "Preparing…" : "Export a PDF"}
            </Button>
          )}

          {!published && (
            <Button
              onClick={() => assemble.mutate()}
              disabled={assemble.isPending}
              variant={assembled ? "outline" : "default"}
            >
              {assemble.isPending ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <Sparkles aria-hidden className="size-4" />
              )}
              {assemble.isPending
                ? "Assembling…"
                : assembled
                  ? "Assemble again"
                  : "Assemble the memoir"}
            </Button>
          )}
        </div>
      </div>

      {/* The four numbers, stated once, after it has just happened. */}
      {assemble.isSuccess && (
        <p className="mt-4 font-sans text-sm text-ink-soft">
          {assemble.data.chapters}{" "}
          {assemble.data.chapters === 1 ? "chapter" : "chapters"},{" "}
          {assemble.data.blocks}{" "}
          {assemble.data.blocks === 1 ? "passage" : "passages"},{" "}
          {assemble.data.figures}{" "}
          {assemble.data.figures === 1 ? "photograph" : "photographs"} placed.
        </p>
      )}

      {assemble.isError && (
        <p className="mt-4 font-sans text-sm text-seal">
          {assemble.error.message}
        </p>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Sealing it                                                        */}
      {/* ---------------------------------------------------------------- */}
      {assembled && !published && (
        <div className="mt-6 border-t border-border pt-5">
          {!showPassphrase ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
                Sealing it is permanent. Afterwards the words can never change —
                which is what lets every reflection your family leaves stay
                anchored to the exact passage it was about.
              </p>
              <Button variant="outline" onClick={() => setShowPassphrase(true)}>
                <Lock aria-hidden className="size-4" />
                Seal the memoir
              </Button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit((values) =>
                publish.mutate(values.passphrase, {
                  onSuccess: () => setShowPassphrase(false),
                }),
              )}
              className="max-w-md space-y-3"
            >
              <label htmlFor="passphrase" className="eyebrow-muted block">
                A passphrase for your family
              </label>
              <Input
                id="passphrase"
                autoComplete="off"
                placeholder="the house on ellsworth lane"
                {...register("passphrase")}
              />
              <p className="font-sans text-xs leading-relaxed text-ink-faint">
                You will tell people this yourself, separately from the link.
                Nothing here can read it back to you afterwards — it can only be
                replaced.
              </p>
              {errors.passphrase && (
                <p className="font-sans text-xs text-seal">
                  {errors.passphrase.message}
                </p>
              )}
              {publish.isError && (
                <p className="font-sans text-xs text-seal">
                  {publish.error.message}
                </p>
              )}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={publish.isPending}>
                  {publish.isPending ? "Sealing…" : "Seal it"}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowPassphrase(false)}
                  className="font-sans text-sm text-ink-soft transition-colors hover:text-foreground"
                >
                  Not yet
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* The link, once there is one                                       */}
      {/* ---------------------------------------------------------------- */}
      {published && memoir?.view_token && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <code className="max-w-full overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-xs text-ink-soft">
            {readingUrl ?? `/m/${memoir.view_token}`}
          </code>
          <Button variant="outline" onClick={copyLink}>
            {copyLabel}
          </Button>
        </div>
      )}
    </section>
  );
}
