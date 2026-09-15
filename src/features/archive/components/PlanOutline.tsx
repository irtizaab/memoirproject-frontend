"use client";

import type { MemoirPlan, PlannedChapter } from "@/features/archive/schemas";

/**
 * The plan, as it stands: numbered chapters, what each holds, and what the
 * reviewer and the guide had to say about it.
 *
 * A review surface, not an editor. It used to carry rename, move and drop
 * controls and a save button; those went into the conversation with the
 * guide, which answers "call the third chapter Beginnings" by doing it. The
 * numbers here are the ones the guide refers to, so they are shown.
 */
export function PlanOutline({
  plan,
  sealed,
}: {
  plan: MemoirPlan;
  sealed: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-heading text-base leading-snug font-normal">
          {sealed ? "How the book was organised" : "How the book reads"}
        </h3>
        <p className="font-sans text-xs text-ink-faint">
          {plan.organised_by === "planner"
            ? "Divided where the life divides, by reading the whole archive."
            : "Divided by decade instead."}
        </p>
      </div>

      {/* The guide's note when there is one; the planner's bare reason for
          standing aside when there is not. Never both — the guide was told
          the reason and has already said it in plainer words. */}
      {plan.guide ? (
        <p className="mt-3 font-sans text-sm text-ink-soft">{plan.guide}</p>
      ) : (
        plan.organised_by !== "planner" &&
        plan.reason && (
          <p className="mt-3 font-sans text-sm text-ink-soft">{plan.reason}</p>
        )
      )}

      {/* The reviewer's findings. A second model read the draft against the
          archive; what it changed is marked, what it could not is left for
          the owner — usually by adding to the archive. */}
      {plan.review && plan.review.findings.length > 0 && (
        <div className="mt-4">
          <h4 className="font-sans text-xs text-ink-faint">
            What the reviewer found
          </h4>
          <ul className="mt-1.5 space-y-1.5">
            {plan.review.findings.map((finding, index) => (
              <li key={index} className="font-sans text-sm text-ink-soft">
                {finding.chapter && (
                  <span className="text-foreground">{finding.chapter} — </span>
                )}
                {finding.note}
                {finding.fixed && (
                  <span className="ml-1.5 text-xs text-ink-faint">changed</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className="mt-4 max-h-64 space-y-1 overflow-y-auto pr-1">
        {plan.chapters.map((chapter, index) => (
          <li
            key={chapter.id}
            className="flex items-baseline gap-3 border-b border-border/60 py-1.5 last:border-b-0"
          >
            <span className="w-6 shrink-0 font-mono text-xs text-ink-faint">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm">{chapter.title}</p>
              <p className="mt-0.5 font-sans text-xs text-ink-faint">
                {chapterSummary(chapter)}
              </p>
            </div>
          </li>
        ))}
      </ol>
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
