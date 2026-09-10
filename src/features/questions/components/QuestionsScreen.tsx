"use client";

import { useState } from "react";

import { PageBody } from "@/components/layout/PageBody";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useActiveMemoir } from "@/features/account";
import { QuestionRow } from "@/features/questions/components/QuestionRow";
import {
  useGenerateLibrary,
  useQuestionLibrary,
} from "@/features/questions/hooks";
import { GROUP_LABELS, GROUP_ORDER } from "@/features/questions/schemas";

/**
 * "What your family is asked" — the questions screen.
 *
 * ---------------------------------------------------------------------------
 * Why this screen exists at all
 * ---------------------------------------------------------------------------
 * An earlier version of this feature wrote a question for each contributor as
 * they arrived, out of whatever they had just said, and the owner never saw
 * any of it. A model was deciding unsupervised what a grieving family would be
 * asked about somebody they had lost.
 *
 * This screen is that feature with the owner put back in the middle of it. The
 * model drafts, the owner reads and edits, and only then is anybody asked
 * anything.
 *
 * ---------------------------------------------------------------------------
 * The shape
 * ---------------------------------------------------------------------------
 * A rail on the left for what the questions get written from, and the questions
 * themselves on the right, at reading size. The two are different registers and
 * used to sit in one column at one weight, so the page read as a form rather
 * than as a list of things somebody will be asked.
 *
 * `questions_mode` is not surfaced here. It still exists and still decides what
 * contributors see, but writing a set sets it to `custom` on the backend
 * (`prompt_service.py`), so the choice was a control whose only correct answer
 * the act of pressing the button already gave. What the page shows is simply
 * what a contributor would be asked today.
 *
 * ---------------------------------------------------------------------------
 * What this screen must never grow
 * ---------------------------------------------------------------------------
 * No count of questions, no "5 of 5", no completion state, no praise for
 * generating a set, no nudge to write more. `AGENTS.md` forbids gamification
 * and a memoir has no denominator. It is a list of questions and the controls
 * to change them.
 */
export function QuestionsScreen() {
  const { memoir, isPending: loadingMemoir } = useActiveMemoir();
  const memoirId = memoir?.id ?? null;

  const { data: library, isPending, error } = useQuestionLibrary(memoirId);
  const generate = useGenerateLibrary(memoirId ?? "");

  /*
    The box shows what was saved last time until somebody types.

    Derived rather than copied into state by an effect: `null` means untouched
    this visit, so the saved notes render, and anything else is what they are
    typing now. An effect that synced the two would fire again when the library
    refetches and overwrite a half-written sentence — and React would rather we
    did not (`react-hooks/set-state-in-effect`).
  */
  const [typed, setTyped] = useState<string | null>(null);

  if (loadingMemoir || isPending) {
    return (
      <PageBody>
        <p className="font-sans text-sm text-muted-foreground">Loading…</p>
      </PageBody>
    );
  }

  if (!memoir || !memoirId) {
    return (
      <PageBody>
        <p className="font-sans text-sm text-muted-foreground">
          There is no memoir here yet.
        </p>
      </PageBody>
    );
  }

  if (error || !library) {
    return (
      <PageBody>
        <p role="alert" className="font-sans text-sm text-seal">
          These questions could not be loaded. Please try again.
        </p>
      </PageBody>
    );
  }

  const notes = typed ?? library.subject_notes ?? "";
  const firstName = library.subject_name.split(" ")[0];
  const busy = generate.isPending;

  return (
    <>
      <PageHeader
        eyebrow="Questions"
        title="What your family is asked"
        description={`Everyone who opens your link sees three or four of these before the box they write in, chosen by how they knew ${firstName}. Rewrite any of them, or have a set written for ${firstName} in particular.`}
      />

      <PageBody>
        <div className="grid gap-11 lg:grid-cols-[296px_minmax(0,1fr)] lg:items-start">
          {/* ------------------------------------------------------------ */}
          {/* The rail: what to write the questions from                    */}
          {/* ------------------------------------------------------------ */}
          <div className="flex flex-col gap-6">
            <section>
              <label htmlFor="subject_notes" className="eyebrow block">
                Anything else about {firstName}
              </label>
              <p className="mt-2.5 font-sans text-[13px] leading-relaxed text-muted-foreground">
                Where they lived, what they did, what people always mention. A
                few sentences is enough — it is only used to write the
                questions.
              </p>
              <textarea
                id="subject_notes"
                value={notes}
                onChange={(event) => setTyped(event.target.value)}
                placeholder="She ran the shop on Depot Street for thirty years and kept bees behind it…"
                rows={5}
                disabled={busy}
                className="mt-3 field-sizing-content block min-h-[132px] w-full resize-y rounded-lg border border-input bg-card px-4 py-3.5 font-heading text-base leading-relaxed font-light text-foreground placeholder:font-light placeholder:text-ink-faint placeholder:italic focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-ring disabled:opacity-60"
              />

              <Button
                type="button"
                onClick={() => generate.mutate({ notes: notes.trim() || null })}
                disabled={busy}
                className="mt-3.5 h-11 w-full"
              >
                {generate.isPending
                  ? "Writing…"
                  : library.mode === "custom"
                    ? "Write them again"
                    : `Write questions for ${firstName}`}
              </Button>

              <p className="mt-3 font-sans text-xs leading-relaxed text-ink-faint">
                {library.mode === "custom"
                  ? "Questions you have rewritten yourself are kept."
                  : "Drafted for you to read and edit. Nobody is asked anything until you have."}
              </p>

              {generate.isError && (
                <p role="alert" className="mt-3 font-sans text-sm text-seal">
                  These could not be written just now. Nothing has been lost —
                  what you typed is saved, and the standard questions are still
                  there.
                </p>
              )}
            </section>
          </div>

          {/* ------------------------------------------------------------ */}
          {/* The questions themselves                                      */}
          {/* ------------------------------------------------------------ */}
          <div className="flex flex-col gap-10">
            {GROUP_ORDER.map((group) => {
              const written =
                library.groups.find((g) => g.relationship === group)
                  ?.questions ?? [];
              const shipped =
                library.standard.find((g) => g.relationship === group)
                  ?.questions ?? [];

              // What a contributor in this group would actually be asked
              // today. Custom mode falls back to the shipped set for a group
              // the owner emptied, so the screen has to show the same fallback
              // or it would be describing a page nobody sees.
              const showingWritten =
                library.mode === "custom" && written.length > 0;

              return (
                <section key={group}>
                  <div className="border-b border-ink pb-2.5">
                    <h2 className="font-heading text-[21px] font-normal tracking-tight">
                      {GROUP_LABELS[group]}
                    </h2>
                  </div>

                  {showingWritten ? (
                    <ul>
                      {written.map((question, i) => (
                        <QuestionRow
                          key={question.id}
                          memoirId={memoirId}
                          question={question}
                          index={i + 1}
                        />
                      ))}
                    </ul>
                  ) : (
                    <>
                      <ul>
                        {shipped.map((question, i) => (
                          <li
                            key={question}
                            className="flex items-baseline gap-4 border-b border-border py-4 sm:gap-[18px]"
                          >
                            <span className="w-3.5 shrink-0 font-sans text-[10.5px] font-medium text-ink-faint">
                              {i + 1}
                            </span>
                            <span className="flex-1 font-heading text-[17px] leading-[1.55] font-light">
                              {question}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {library.mode === "custom" && (
                        <p className="mt-3 font-sans text-sm text-ink-faint">
                          Nothing has been written for this group, so these are
                          used instead.
                        </p>
                      )}
                    </>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </PageBody>
    </>
  );
}
