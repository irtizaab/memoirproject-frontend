"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Undo2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { useUpdatePlan } from "@/features/archive/hooks";
import type { MemoirPlan, PlannedChapter } from "@/features/archive/schemas";

/**
 * The plan, before it is a book — and the one place the owner can change it.
 *
 * A model reads the whole archive and decides what the memoir is: where the
 * chapters divide, what each is called, and which photograph belongs beside
 * which paragraph. Until this screen existed, none of that was visible. The
 * decision was made inside one request, written into the book, and the person
 * whose book it is saw only the result.
 *
 * So this is deliberately a review surface first and an editor second. It
 * shows what was decided, in reading order, with the counts that say how much
 * of the archive each chapter holds — and then lets the owner rename, move or
 * drop a chapter.
 *
 * ---------------------------------------------------------------------------
 * Why buttons and not drag-and-drop
 * ---------------------------------------------------------------------------
 * A memoir has a handful of chapters, not a hundred. Up and down are keyboard
 * reachable and screen-reader legible with no work at all, which drag-and-drop
 * is not without a great deal, and the app carries no drag dependency to
 * spend on ten rows.
 *
 * ---------------------------------------------------------------------------
 * Why the changes are staged and saved together
 * ---------------------------------------------------------------------------
 * Because reordering is a sequence of moves, and saving after each one would
 * send four requests to express "third becomes first" — each of them a
 * complete plan document, each able to fail halfway. The owner rearranges,
 * reads it back, and saves once.
 *
 * `PATCH` takes the whole chapter list for the same reason: order is array
 * position, renumbered server-side, so nothing here has to invent an ordinal
 * and the server never has to trust one.
 */
export function PlanOutline({
  plan,
  memoirId,
  readOnly,
}: {
  plan: MemoirPlan;
  memoirId: string | null;
  readOnly: boolean;
}) {
  const update = useUpdatePlan(memoirId);
  const [draft, setDraft] = useState<PlannedChapter[]>(plan.chapters);

  // Note there is no effect resetting `draft` when `plan` changes. The plan is
  // the source of truth and it does change underneath this component —
  // regenerating replaces every chapter and every id, and a stale draft would
  // 400 on save. That is handled by remounting instead: `BookPanel` keys this
  // component on the plan's own timestamps, so a new plan is a new component
  // with a fresh draft. Cheaper than an effect, and it cannot be half-applied.

  const dirty =
    draft.length !== plan.chapters.length ||
    draft.some((chapter, index) => {
      const original = plan.chapters[index];
      return (
        !original ||
        original.id !== chapter.id ||
        original.title !== chapter.title
      );
    });

  const move = (index: number, by: -1 | 1) => {
    const to = index + by;
    if (to < 0 || to >= draft.length) return;
    const next = [...draft];
    [next[index], next[to]] = [next[to], next[index]];
    setDraft(next);
  };

  const rename = (index: number, title: string) => {
    const next = [...draft];
    next[index] = { ...next[index], title };
    setDraft(next);
  };

  const drop = (index: number) => {
    setDraft(draft.filter((_, position) => position !== index));
  };

  return (
    <div className="mt-6 border-t border-border pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-heading text-base leading-snug font-normal">
          {readOnly ? "How the book was organised" : "How the book will read"}
        </h3>
        <p className="font-sans text-xs text-ink-faint">
          {plan.organised_by === "planner"
            ? "Divided where the life divides, by reading the whole archive."
            : "Divided by decade — the archive could not be read this time."}
        </p>
      </div>

      <ol className="mt-4 space-y-1">
        {draft.map((chapter, index) => (
          <li
            key={chapter.id}
            className="flex flex-wrap items-center gap-3 border-b border-border/60 py-2 last:border-b-0"
          >
            <span className="w-6 shrink-0 font-mono text-xs text-ink-faint">
              {index + 1}
            </span>

            <div className="min-w-[16ch] flex-1">
              {readOnly ? (
                <p className="font-sans text-sm">{chapter.title}</p>
              ) : (
                <Input
                  aria-label={`Title of chapter ${index + 1}`}
                  value={chapter.title}
                  onChange={(event) => rename(index, event.target.value)}
                  className="h-9"
                />
              )}
              <p className="mt-0.5 font-sans text-xs text-ink-faint">
                {chapterSummary(chapter)}
              </p>
            </div>

            {!readOnly && (
              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  label={`Move chapter ${index + 1} earlier`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp aria-hidden className="size-4" />
                </IconButton>
                <IconButton
                  label={`Move chapter ${index + 1} later`}
                  disabled={index === draft.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown aria-hidden className="size-4" />
                </IconButton>
                <IconButton
                  label={`Leave chapter ${index + 1} out`}
                  disabled={draft.length === 1}
                  onClick={() => drop(index)}
                >
                  <X aria-hidden className="size-4" />
                </IconButton>
              </div>
            )}
          </li>
        ))}
      </ol>

      {!readOnly && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => update.mutate(draft)}
            disabled={!dirty || update.isPending}
          >
            {update.isPending ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : null}
            {update.isPending ? "Saving…" : "Save the outline"}
          </Button>

          {dirty && !update.isPending && (
            <button
              type="button"
              onClick={() => setDraft(plan.chapters)}
              className="inline-flex items-center gap-1.5 font-sans text-sm text-ink-soft transition-colors hover:text-foreground"
            >
              <Undo2 aria-hidden className="size-3.5" />
              Put it back
            </button>
          )}

          <p className="basis-full font-sans text-xs leading-relaxed text-ink-faint">
            A chapter left out stays in the archive — every memory in it is
            still there, and planning again brings it back.
          </p>
        </div>
      )}

      {update.isError && (
        <p className="mt-3 font-sans text-sm text-seal">
          {update.error.message}
        </p>
      )}
    </div>
  );
}

/**
 * What a chapter holds, in the two numbers that are facts rather than scores.
 *
 * No percentage and no total: the archive README forbids it, and a chapter has
 * no denominator any more than a memoir does.
 */
function chapterSummary(chapter: PlannedChapter): string {
  const parts: string[] = [];

  if (chapter.from_year) {
    parts.push(
      chapter.through_year && chapter.through_year !== chapter.from_year
        ? `${chapter.from_year}–${chapter.through_year}`
        : String(chapter.from_year),
    );
  }

  parts.push(
    `${chapter.blocks.length} ${chapter.blocks.length === 1 ? "passage" : "passages"}`,
  );

  if (chapter.figures.length) {
    parts.push(
      `${chapter.figures.length} ${
        chapter.figures.length === 1 ? "photograph" : "photographs"
      }`,
    );
  }

  return parts.join(" · ");
}
