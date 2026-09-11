"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Undo2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { useEditChapter } from "@/features/memoir/hooks";
import styles from "@/features/memoir/reader.module.css";
import type { Block, Chapter } from "@/features/memoir/schemas";
import { credit, roman } from "@/features/memoir/utils";

/**
 * The page, with the owner's hands on it.
 *
 * Same column, same order, same photographs as the finished page beside it —
 * `ChapterReader` renders that and this renders the editable twin, at the same
 * address, one toggle apart. It is deliberately not `contenteditable` over the
 * reader itself: the reader positions credits, plates and comment cards by
 * character offset against a measured column, and typing inside that would be
 * a layout pass fighting a caret.
 *
 * ---------------------------------------------------------------------------
 * Why this exists at all
 * ---------------------------------------------------------------------------
 * A model drafts the prose from what the family wrote. It is usually close and
 * it is sometimes wrong in a way only the family can see — a name spelled the
 * way nobody spelled it, a sentence that reads as an assertion where the
 * archive was tentative. Before this the only remedy was to plan again and
 * hope, which spends a model call to change one word.
 *
 * ---------------------------------------------------------------------------
 * What it will not do
 * ---------------------------------------------------------------------------
 * There is no "add a passage" button, and there never should be. A paragraph
 * in this product carries `block_source` — which memory it came from and who
 * left it — and prose typed here would have nobody behind it. That is the one
 * thing the whole design refuses. Moving a passage to a different chapter is
 * likewise absent: which chapter a memory belongs in is the plan's decision,
 * and the outline is where it is made.
 *
 * Everything else is here: reword, reorder, remove, rename the chapter, and
 * move a photograph to another paragraph or another placement.
 *
 * ---------------------------------------------------------------------------
 * Why the whole page is saved at once
 * ---------------------------------------------------------------------------
 * Because reordering is a sequence of moves and saving each one would send
 * four requests to express "third becomes first", each of them a complete page
 * and each able to fail halfway. The owner rearranges, reads it back, and
 * saves once — the same argument `PlanOutline` makes about the outline.
 */
export function PageEditor({
  chapter,
  memoirId,
  onClose,
}: {
  chapter: Chapter;
  memoirId: string;
  onClose: () => void;
}) {
  const save = useEditChapter(chapter.id, memoirId);

  const [title, setTitle] = useState(chapter.title);
  const [draft, setDraft] = useState<Block[]>(chapter.blocks);

  // No effect resetting these when `chapter` changes. The page above keys this
  // component on the chapter id, so a different chapter is a different
  // component with a fresh draft — cheaper than an effect, and it cannot be
  // half-applied.

  const paragraphs = draft.filter((block) => block.kind === "paragraph");

  const dirty =
    title !== chapter.title ||
    draft.length !== chapter.blocks.length ||
    draft.some((block, index) => {
      const was = chapter.blocks[index];
      return (
        !was ||
        was.id !== block.id ||
        was.text !== block.text ||
        was.figure?.placement !== block.figure?.placement ||
        was.figure?.anchor_block_id !== block.figure?.anchor_block_id
      );
    });

  const move = (index: number, by: -1 | 1) => {
    const to = index + by;
    if (to < 0 || to >= draft.length) return;
    const next = [...draft];
    [next[index], next[to]] = [next[to], next[index]];
    setDraft(next);
  };

  const update = (index: number, changed: Partial<Block>) => {
    const next = [...draft];
    next[index] = { ...next[index], ...changed };
    setDraft(next);
  };

  const remove = (index: number) => {
    const going = draft[index];
    setDraft(
      draft.filter((block, position) => {
        if (position === index) return false;
        // A photograph cannot outlive the paragraph it sits beside — the
        // database would take it anyway through the anchor cascade, so it is
        // shown leaving here rather than disappearing on save.
        return block.figure?.anchor_block_id !== going.id;
      }),
    );
  };

  const submit = () => {
    save.mutate(
      {
        title,
        blocks: draft.map((block) => ({
          id: block.id,
          ...(block.kind === "figure"
            ? {
                placement: block.figure?.placement,
                anchor_block_id: block.figure?.anchor_block_id,
              }
            : { text: block.text ?? "" }),
        })),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <main className={styles.page}>
      <header className="mb-8">
        <p className="eyebrow-muted">
          Chapter {roman(chapter.ordinal + 1)} · editing
        </p>
        <Input
          aria-label="Chapter title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-3 h-12 font-heading text-2xl"
        />
        <p className="mt-3 font-sans text-xs leading-relaxed text-ink-faint">
          Change any words here and the credit beside them follows: the exact
          phrase somebody supplied is looked for again in what you wrote. Where
          it has gone, their name stays on the whole passage instead of on a
          clause it no longer describes.
        </p>
      </header>

      <ol className="space-y-4">
        {draft.map((block, index) => (
          <li
            key={block.id}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <span className="font-sans text-[9.5px] font-medium tracking-[0.16em] text-ink-faint uppercase">
                {block.kind === "figure"
                  ? "Photograph"
                  : block.kind === "pull"
                    ? "Where accounts differ"
                    : `Passage ${index + 1}`}
              </span>

              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  label={`Move ${describe(block, index)} earlier`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp aria-hidden className="size-4" />
                </IconButton>
                <IconButton
                  label={`Move ${describe(block, index)} later`}
                  disabled={index === draft.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown aria-hidden className="size-4" />
                </IconButton>
                <IconButton
                  label={`Leave ${describe(block, index)} out`}
                  disabled={
                    block.kind === "paragraph" && paragraphs.length === 1
                  }
                  onClick={() => remove(index)}
                >
                  <X aria-hidden className="size-4" />
                </IconButton>
              </div>
            </div>

            {block.kind === "figure" ? (
              <FigureRow
                block={block}
                paragraphs={paragraphs}
                onChange={(figure) =>
                  update(index, {
                    figure: block.figure
                      ? { ...block.figure, ...figure }
                      : null,
                  })
                }
              />
            ) : (
              <>
                <textarea
                  aria-label={`Passage ${index + 1}`}
                  value={block.text ?? ""}
                  onChange={(event) =>
                    update(index, { text: event.target.value })
                  }
                  rows={Math.min(
                    14,
                    Math.ceil((block.text?.length ?? 0) / 70) + 2,
                  )}
                  className="w-full resize-y rounded-xl border border-border bg-paper-deep px-3.5 py-3 font-heading text-[16.5px] leading-[1.7] font-light text-foreground focus:border-seal focus:bg-card focus:outline-none"
                />
                {block.sources.length > 0 && (
                  <p className="mt-2.5 font-sans text-[10.5px] leading-relaxed text-ink-faint">
                    From{" "}
                    {block.sources
                      .map((source) => `${source.name} (${credit(source)})`)
                      .join(" · ")}
                  </p>
                )}
              </>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={submit} disabled={!dirty || save.isPending}>
          {save.isPending ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : null}
          {save.isPending ? "Saving…" : "Save this page"}
        </Button>

        <button
          type="button"
          onClick={onClose}
          className="font-sans text-sm text-ink-soft transition-colors hover:text-foreground"
        >
          {dirty ? "Discard these changes" : "Done"}
        </button>

        {dirty && !save.isPending && (
          <button
            type="button"
            onClick={() => {
              setTitle(chapter.title);
              setDraft(chapter.blocks);
            }}
            className="inline-flex items-center gap-1.5 font-sans text-sm text-ink-soft transition-colors hover:text-foreground"
          >
            <Undo2 aria-hidden className="size-3.5" />
            Put it back
          </button>
        )}

        <p className="basis-full font-sans text-xs leading-relaxed text-ink-faint">
          Anything left out stays in the archive. Assembling the memoir again
          rebuilds this page from the outline and replaces what you change here.
        </p>
      </div>

      {save.isError && (
        <p className="mt-3 font-sans text-sm text-seal">{save.error.message}</p>
      )}
    </main>
  );
}

/** A photograph: where it sits, and which paragraph it belongs beside. */
function FigureRow({
  block,
  paragraphs,
  onChange,
}: {
  block: Block;
  paragraphs: Block[];
  onChange: (figure: {
    placement?: "margin" | "inset" | "carousel";
    anchor_block_id?: string;
  }) => void;
}) {
  const figure = block.figure;
  if (!figure) return null;

  return (
    <div className="flex flex-wrap gap-4">
      {figure.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={figure.url}
          alt={figure.caption ?? "A photograph from this memoir"}
          className="h-24 w-32 shrink-0 rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="h-24 w-32 shrink-0 rounded-lg border border-border bg-paper-deep" />
      )}

      <div className="min-w-[16ch] flex-1 space-y-2.5">
        <label className="block">
          <span className="eyebrow-muted">Shown as</span>
          <select
            value={figure.placement}
            onChange={(event) =>
              onChange({
                placement: event.target.value as
                  "margin" | "inset" | "carousel",
              })
            }
            className="mt-1 w-full rounded-lg border border-border bg-card px-2.5 py-2 font-sans text-sm"
          >
            <option value="margin">In the margin</option>
            <option value="inset">Full width, in the flow</option>
            <option value="carousel">
              In a carousel with others on the same paragraph
            </option>
          </select>
        </label>

        <label className="block">
          <span className="eyebrow-muted">Beside</span>
          <select
            value={figure.anchor_block_id}
            onChange={(event) =>
              onChange({ anchor_block_id: event.target.value })
            }
            className="mt-1 w-full rounded-lg border border-border bg-card px-2.5 py-2 font-sans text-sm"
          >
            {paragraphs.map((paragraph, position) => (
              <option key={paragraph.id} value={paragraph.id}>
                {`Passage ${position + 1} — ${(paragraph.text ?? "").slice(0, 48)}…`}
              </option>
            ))}
          </select>
        </label>

        {figure.caption && (
          <p className="font-sans text-[10.5px] leading-relaxed text-ink-faint">
            “{figure.caption}”
            {figure.credit && <> · given by {figure.credit}</>}
            {" — the caption is the archive's and is not edited here."}
          </p>
        )}
      </div>
    </div>
  );
}

/** What a control is about, for its accessible name. */
function describe(block: Block, index: number): string {
  if (block.kind === "figure") return "this photograph";
  if (block.kind === "pull") return "this pulled line";
  return `passage ${index + 1}`;
}
