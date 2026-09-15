"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BookOpen,
  Download,
  Loader2,
  Lock,
  Wand2,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MemoirSummary } from "@/features/account";
import { GuideChat } from "@/features/archive/components/GuideChat";
import { PlanOutline } from "@/features/archive/components/PlanOutline";
import {
  useBuildMemoir,
  useExportMemoir,
  usePlan,
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
 * "Export a PDF" is absent — not disabled — until `chapter_count` is above
 * zero. A disabled button is a promise with a reason the person has to guess
 * at; an absent one is answered by the sentence beside it, which says what to
 * do instead.
 *
 * "View the memoir" is the exception and is always there. It is the answer to
 * "show me the actual page", and a page with nothing in it is a title page
 * saying the chapters have not been drafted yet — true, and worth being able
 * to see. A PDF of nothing is a broken file, which is the difference.
 *
 * There is no progress indicator, no percentage and no "your memoir is 40%
 * complete". The archive README forbids it and this is the screen most tempted
 * by it: assembly produces four numbers, and they are facts about what the
 * archive turned into rather than a score against a total nobody has.
 *
 * ---------------------------------------------------------------------------
 * One button, and a conversation
 * ---------------------------------------------------------------------------
 * Build, then talk to the guide.
 *
 * It was one button, then three — plan, read, assemble — because a model was
 * deciding how a family's memoir divided into chapters and writing it straight
 * into the book, and the owner could not read the outline, rename a chapter,
 * or tell whether the model had run at all. The outline became a stored row
 * with its own editor between the two buttons.
 *
 * That editor is now the guide. The plan is still a row, still read back
 * here (`PlanOutline`), but changing it — a title, an order, a chapter left
 * out, or the whole division of the memories — is said in words to the guide,
 * which does it and rebuilds the book in the same request. So "plan" and
 * "assemble" are one button again, and this panel's job is to say what
 * pressing it costs: building again replaces a page corrected by hand at
 * `/preview/{memoirId}`.
 */
export function BookPanel({ memoir }: { memoir: MemoirSummary | null }) {
  const memoirId = memoir?.id ?? null;
  const assembled = (memoir?.chapter_count ?? 0) > 0;
  const published = Boolean(memoir?.published_at);

  const planQuery = usePlan(memoirId);
  const build = useBuildMemoir(memoirId);
  const publish = usePublishMemoir(memoirId);
  const exportPdf = useExportMemoir(memoirId);

  const plan = planQuery.data ?? null;
  const planned = Boolean(plan);
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
                : "Read it through before sealing it. Building again reads everything in the archive, including whatever arrived since, and rewrites the book."
              : "Building reads every memory, recording and photograph, works out where the chapters divide, what each is called, and where each photograph belongs — and writes the book."}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {/*
            Before sealing, the owner reads their own copy at `/preview`; after
            it, the link the family holds. Two addresses because they are two
            different things — one is behind their account, the other behind a
            passphrase they hand out — and one button at a time, because only
            one of them is ever the right way in.

            The preview is the whole reason this panel can say "read it through
            before sealing it". It used to say that while a view link, and so
            the only way to open the book, did not exist until publication —
            the one step that cannot be undone.

            **Not conditional on `assembled`**, unlike the PDF beside it. This
            is the answer to "let me see the actual page", and gating it on a
            count means the answer is missing at exactly the moment somebody
            goes looking for it. A PDF of nothing is a broken file; a *page*
            with nothing in it is a title page that says the chapters have not
            been drafted yet, which is true and is worth being able to see.
          */}
          {memoirId && (
            <a
              href={
                published && memoir?.view_token
                  ? `/m/${memoir.view_token}`
                  : `/preview/${memoirId}`
              }
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

          {/* Planning and writing, as one step. They are two requests
              underneath — the plan is still a row the guide can edit — but
              to the owner "plan" and "assemble" were one decision asked
              twice. */}
          {!published && (
            <Button
              onClick={() => build.mutate()}
              disabled={build.isPending}
              variant={assembled ? "outline" : "default"}
            >
              {build.isPending ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <Wand2 aria-hidden className="size-4" />
              )}
              {build.isPending
                ? "Building…"
                : assembled
                  ? "Build it again"
                  : "Build the memoir"}
            </Button>
          )}
        </div>
      </div>

      {/* Building takes minutes, so it says what it is doing while it does it. */}
      {build.isPending && (
        <p className="mt-4 font-sans text-sm text-ink-soft">
          Reading every memory, and looking at every photograph. This takes a
          few minutes on a full archive — the page can be left open.
        </p>
      )}

      {/* Rebuilding throws away hand corrections, so it says so beforehand. */}
      {!published && assembled && (
        <p className="mt-4 font-sans text-sm text-ink-soft">
          Building again — here or through the guide — rewrites every chapter,
          which replaces anything you corrected by hand while reading the
          memoir.
        </p>
      )}

      {/* The four numbers, stated once, after it has just happened. */}
      {build.isSuccess && (
        <p className="mt-4 font-sans text-sm text-ink-soft">
          {build.data.chapters}{" "}
          {build.data.chapters === 1 ? "chapter" : "chapters"},{" "}
          {build.data.blocks}{" "}
          {build.data.blocks === 1 ? "passage" : "passages"},{" "}
          {build.data.figures}{" "}
          {build.data.figures === 1 ? "photograph" : "photographs"} placed.
        </p>
      )}

      {build.isError && (
        <p className="mt-4 font-sans text-sm text-seal">{build.error.message}</p>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* The outline: what the model decided, and the owner's say over it  */}
      {/* ---------------------------------------------------------------- */}
      {/* Before sealing: the outline and the conversation that changes it,
          in one panel. After: the outline as it was organised, and nothing
          to say about it. */}
      {plan && published && (
        <div className="mt-6 border-t border-border pt-5">
          <PlanOutline plan={plan} sealed />
        </div>
      )}
      {!published && planned && (
        <div className="mt-6 border-t border-border pt-5">
          <GuideChat memoirId={memoirId} />
        </div>
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
