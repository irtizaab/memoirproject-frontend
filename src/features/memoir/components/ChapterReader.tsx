"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { CommentComposer } from "@/features/memoir/components/CommentComposer";
import { CommentThreadCard } from "@/features/memoir/components/CommentThreadCard";
import {
  MarginPlate,
  SourceCredits,
  VoiceCredit,
} from "@/features/memoir/components/MarginObjects";
import { useLeaveComment, useThreads } from "@/features/memoir/hooks";
import styles from "@/features/memoir/reader.module.css";
import type {
  Block,
  Chapter,
  CommentFormValues,
  MemoirReading,
} from "@/features/memoir/schemas";
import { useLanes } from "@/features/memoir/useLanes";
import {
  chapterYears,
  figuresFor,
  roman,
  segment,
  threadsForBlock,
  toldBy,
} from "@/features/memoir/utils";
import { cn } from "@/lib/utils";

/** What the composer is currently about. */
type Draft =
  | { kind: "thread"; blockId: string; start?: number; end?: number }
  | { kind: "reply"; threadId: string };

/**
 * One chapter, read.
 *
 * Four things happen on this page that are worth naming, because each is a
 * decision the design rests on:
 *
 * 1. **The prose carries no marks.** No superscripts, no brackets. A paragraph
 *    reads exactly as it would in a printed book.
 * 2. **A gutter numeral does two jobs** — it is the citation key the margin
 *    refers to, and the durable link a reader copies to send somebody "the bit
 *    about the piano". One mark, and it survives into print.
 * 3. **Attribution is reciprocal.** Hovering a credit underlines the exact
 *    clause it fathered; hovering the clause lifts the credit. This is what a
 *    memoir assembled from twenty people owes its reader.
 * 4. **Comments have their own column**, because they outlive everything else
 *    on the page.
 */
export function ChapterReader({
  token,
  reader,
  readerName,
  reading,
  chapter,
}: {
  token: string;
  /** The session this page was rendered with. Says who is reading. */
  reader: string;
  /** Their name, as given at the door. Printed above a reflection, never asked. */
  readerName: string;
  reading: MemoirReading;
  chapter: Chapter;
}) {
  const { data: threads = [] } = useThreads(
    token,
    chapter.id,
    reader,
    chapter.threads,
  );
  const leave = useLeaveComment(token, chapter.id, reader);

  const [focusedThread, setFocusedThread] = useState<string | null>(null);
  const [litSource, setLitSource] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [copied, setCopied] = useState(false);
  const [selection, setSelection] = useState<{
    blockId: string;
    start: number;
    end: number;
    left: number;
    top: number;
  } | null>(null);

  // What changes here changes what needs placing: the chapter, the number of
  // comments, which thread is expanded, and whether a composer is open.
  const rootRef = useLanes(
    `${chapter.id}|${threads.length}|${focusedThread}|${JSON.stringify(draft)}`,
  );

  /**
   * The number in the gutter beside each paragraph.
   *
   * Counted once, up front, rather than incremented while rendering. Only
   * prose is numbered — a figure is not a paragraph, and a pulled line is
   * editorial rather than remembered, so neither takes a citation key.
   */
  const numbers = useMemo(() => {
    const map = new Map<string, number>();
    let n = 0;
    for (const block of chapter.blocks) {
      if (block.kind === "paragraph") map.set(block.id, (n += 1));
    }
    return map;
  }, [chapter.blocks]);

  const submit = (values: CommentFormValues) => {
    if (!draft) return;

    leave.mutate(
      {
        body: values.body,
        ...(draft.kind === "reply"
          ? { thread_id: draft.threadId }
          : {
              block_id: draft.blockId,
              start_offset: draft.start,
              end_offset: draft.end,
            }),
      },
      {
        onSuccess: (receipt) => {
          setDraft(null);
          setFocusedThread(receipt.thread.id);
        },
      },
    );
  };

  const copyAnchor = (anchor: string) => {
    const url = `${window.location.href.split("#")[0]}#${anchor}`;
    void navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const index = reading.chapters.findIndex((c) => c.id === chapter.id);
  const previous = reading.chapters[index - 1];
  const next = reading.chapters[index + 1];

  return (
    <main ref={rootRef} className={styles.page}>
      {/*
        A chapter opens the way a printed one does: an ornament, the number and
        the years it covers, the title, and a rule under it. Centred, which is
        the one place in the reader that is — the prose underneath is set flush
        left, because centred body text is unreadable and centred openings are
        how a book says a new part has started.
      */}
      <header className="mb-11 text-center">
        <span
          aria-hidden
          className="mx-auto flex size-9 items-center justify-center rounded-xl border border-border bg-muted font-heading text-sm text-seal"
        >
          ❦
        </span>
        <p className="eyebrow mt-5 flex justify-center gap-4">
          <span>Chapter {roman(chapter.ordinal + 1)}</span>
          {chapterYears(chapter) && <span>{chapterYears(chapter)}</span>}
        </p>
        <h2 className="mx-auto mt-3.5 max-w-[14em] font-heading text-[clamp(28px,4vw,40px)] leading-tight font-normal tracking-tight text-balance">
          {chapter.title}
        </h2>
        <span
          aria-hidden
          className="relative mx-auto mt-7 block h-px w-52 bg-rule after:absolute after:top-1/2 after:left-1/2 after:size-1.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:border after:border-seal after:bg-accent"
        />
      </header>

      {chapter.blocks.map((block) => {
        if (block.kind === "figure") {
          // A margin plate is drawn in the lane, beside its anchor. Only an
          // inset belongs in the flow — a photograph that is the moment rather
          // than an illustration of it.
          return block.figure?.placement === "inset" ? (
            <InsetFigure key={block.id} block={block} />
          ) : null;
        }

        if (block.kind === "pull") {
          // Editorial rather than remembered — the assembly step writes these
          // to mark something the archive disagreed about — so it carries no
          // sources and says why it is set apart instead of leaving a reader
          // to wonder who said it.
          return (
            <aside
              key={block.id}
              data-block={block.id}
              className="my-9 rounded-2xl border border-border bg-muted/60 px-6 py-5"
            >
              <p className="eyebrow flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="inline-block size-1.5 rounded-full bg-seal"
                />
                Where accounts differ
              </p>
              <p className="mt-3.5 font-heading text-xl leading-relaxed font-light italic text-foreground">
                {block.text}
              </p>
              <p className="mt-4 border-t border-border pt-3 font-sans text-xs text-ink-faint">
                Both accounts are kept, and neither has been corrected.
              </p>
            </aside>
          );
        }

        const number = numbers.get(block.id) ?? 0;
        const anchor = `p${number}`;
        const blockThreads = threadsForBlock(block.id, threads);
        const marginFigures = figuresFor(block.id, chapter.blocks, "margin");
        const voice = block.sources.find((s) => s.medium === "voice") ?? null;

        return (
          <Fragment key={block.id}>
            <Paragraph
              block={block}
              anchor={anchor}
              number={number}
              first={number === 1}
              threads={blockThreads}
              focusedThread={focusedThread}
              litSource={litSource}
              onLightSource={setLitSource}
              onFocusThread={setFocusedThread}
              onCopyAnchor={() => copyAnchor(anchor)}
              onComment={() => setDraft({ kind: "thread", blockId: block.id })}
              onSelect={setSelection}
            />

            {/* ---- lane one: the apparatus, sealed with the book ---- */}
            {marginFigures.map((figure) => (
              <div
                key={figure.id}
                data-lane="margin"
                data-anchor={block.id}
                className={cn(styles.lane, styles.laneMargin)}
              >
                <MarginPlate block={figure} />
              </div>
            ))}

            {voice && (
              <div
                data-lane="margin"
                data-anchor={block.id}
                className={cn(styles.lane, styles.laneMargin)}
              >
                <VoiceCredit source={voice} />
              </div>
            )}

            {block.sources.length > 0 && (
              <div
                data-lane="margin"
                data-anchor={block.id}
                className={cn(
                  styles.lane,
                  styles.laneMargin,
                  block.sources.some((s) => s.id === litSource) &&
                    styles.laneLit,
                )}
              >
                <SourceCredits
                  sources={block.sources}
                  paragraphNumber={number}
                  litSourceId={litSource}
                  onLight={setLitSource}
                />
              </div>
            )}

            {/* ---- lane two: the conversation, open forever ---- */}
            {blockThreads.map((thread) => (
              <div
                key={thread.id}
                data-lane="comment"
                data-anchor={block.id}
                className={cn(
                  styles.lane,
                  styles.laneComment,
                  focusedThread === thread.id && styles.laneFocused,
                )}
              >
                <CommentThreadCard
                  thread={thread}
                  focused={focusedThread === thread.id}
                  onFocus={() =>
                    setFocusedThread((was) =>
                      was === thread.id ? null : thread.id,
                    )
                  }
                  onReply={() =>
                    setDraft({ kind: "reply", threadId: thread.id })
                  }
                >
                  {draft?.kind === "reply" && draft.threadId === thread.id && (
                    <CommentComposer
                      replying
                      readerName={readerName}
                      pending={leave.isPending}
                      error={leave.error?.message ?? null}
                      onCancel={() => setDraft(null)}
                      onSubmit={submit}
                    />
                  )}
                </CommentThreadCard>
              </div>
            ))}

            {draft?.kind === "thread" && draft.blockId === block.id && (
              <div
                data-lane="comment"
                data-anchor={block.id}
                className={cn(
                  styles.lane,
                  styles.laneComment,
                  styles.laneFocused,
                  "border border-seal bg-paper-deep p-3.5",
                )}
              >
                <p className="mb-2.5 font-sans text-[9.5px] font-medium tracking-[0.14em] text-seal uppercase">
                  {draft.start === undefined
                    ? `On paragraph ${number}`
                    : "On the words you chose"}
                </p>
                <CommentComposer
                  readerName={readerName}
                  pending={leave.isPending}
                  error={leave.error?.message ?? null}
                  onCancel={() => setDraft(null)}
                  onSubmit={submit}
                />
              </div>
            )}
          </Fragment>
        );
      })}

      {/*
        The memoir is assembled from people, so the chapter closes by saying
        which ones. A chapter is the right granularity: a byline per paragraph
        would shred the prose.
      */}
      {chapter.told_by.length > 0 && (
        <footer className="mt-14 text-center">
          <p className="font-heading text-2xl italic text-foreground">
            End of chapter {roman(chapter.ordinal + 1).toLowerCase()}
          </p>
          <span
            aria-hidden
            className="mx-auto mt-3.5 block h-0.5 w-14 rounded-full bg-seal/60"
          />
          <p className="mx-auto mt-6 max-w-prose font-sans text-xs leading-relaxed text-ink-faint">
            <span className="eyebrow-muted mb-2 block">Told by</span>
            {toldBy(chapter.told_by)} · {chapter.memory_count}{" "}
            {chapter.memory_count === 1 ? "memory" : "memories"}
          </p>
        </footer>
      )}

      <nav className="mt-16 flex justify-between gap-6 border-t border-border pt-5">
        {previous ? (
          <Link
            href={`/m/${token}/${previous.id}`}
            className="max-w-[46%] text-ink-faint transition-colors hover:text-foreground"
          >
            <span className="eyebrow-muted mb-1.5 block">Back</span>
            <span className="font-heading text-base leading-snug font-light">
              {previous.title}
            </span>
          </Link>
        ) : (
          <Link
            href={`/m/${token}`}
            className="max-w-[46%] text-ink-faint transition-colors hover:text-foreground"
          >
            <span className="eyebrow-muted mb-1.5 block">Back</span>
            <span className="font-heading text-base leading-snug font-light">
              Title page
            </span>
          </Link>
        )}

        {next && (
          <Link
            href={`/m/${token}/${next.id}`}
            className="max-w-[46%] text-right text-ink-faint transition-colors hover:text-foreground"
          >
            <span className="eyebrow-muted mb-1.5 block">Onward</span>
            <span className="font-heading text-base leading-snug font-light">
              {next.title}
            </span>
          </Link>
        )}
      </nav>

      {/*
        Selecting a phrase offers to comment on exactly those words. Safe to
        anchor by character offset because a published memoir never changes —
        the text cannot move out from under it.
      */}
      {selection && (
        <button
          type="button"
          style={{ left: selection.left, top: selection.top }}
          onClick={() => {
            setDraft({
              kind: "thread",
              blockId: selection.blockId,
              start: selection.start,
              end: selection.end,
            });
            window.getSelection()?.removeAllRanges();
            setSelection(null);
          }}
          className="fixed z-50 -translate-x-1/2 -translate-y-full bg-ink px-3 py-2 font-sans text-[9.5px] font-medium tracking-[0.14em] text-paper uppercase"
        >
          Comment on this
        </button>
      )}

      <p
        aria-live="polite"
        className={cn(
          "fixed bottom-8 left-1/2 z-50 -translate-x-1/2 bg-ink px-5 py-3 font-sans text-[10.5px] font-medium tracking-[0.14em] text-paper uppercase transition-opacity",
          copied ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        Link copied
      </p>
    </main>
  );
}

/* ------------------------------------------------------------------ prose */

function Paragraph({
  block,
  anchor,
  number,
  first,
  threads,
  focusedThread,
  litSource,
  onLightSource,
  onFocusThread,
  onCopyAnchor,
  onComment,
  onSelect,
}: {
  block: Block;
  anchor: string;
  number: number;
  first: boolean;
  threads: ReturnType<typeof threadsForBlock>;
  focusedThread: string | null;
  litSource: string | null;
  onLightSource: (id: string | null) => void;
  onFocusThread: (id: string | null) => void;
  onCopyAnchor: () => void;
  onComment: () => void;
  onSelect: (
    selection: {
      blockId: string;
      start: number;
      end: number;
      left: number;
      top: number;
    } | null,
  ) => void;
}) {
  const proseRef = useRef<HTMLSpanElement>(null);
  const runs = segment(block.text ?? "", block.sources, threads);

  /**
   * A thread anchored to the whole paragraph has no words of its own to light,
   * so the paragraph lights instead — the way a whole-paragraph comment reads
   * in a document.
   */
  const wholeLit = threads.some(
    (thread) => thread.id === focusedThread && thread.start_offset === null,
  );

  return (
    <p
      id={anchor}
      data-block={block.id}
      onMouseUp={() => onSelect(readSelection(proseRef.current, block.id))}
      className={cn(
        styles.para,
        first && styles.drop,
        "relative mb-6 font-heading text-[18.5px] leading-[1.72] font-light",
        wholeLit && "bg-paper-deep",
      )}
    >
      <span ref={proseRef}>
        {runs.map((run, position) => {
          const lit = run.sources.includes(litSource ?? "");
          const commented = run.threads.length > 0;
          const focused = run.threads.includes(focusedThread ?? "");

          if (!lit && !commented) {
            return <Fragment key={position}>{run.text}</Fragment>;
          }

          return (
            <span
              key={position}
              onMouseEnter={() =>
                run.sources[0] && onLightSource(run.sources[0])
              }
              onMouseLeave={() => run.sources[0] && onLightSource(null)}
              onClick={
                commented
                  ? () => onFocusThread(focused ? null : run.threads[0])
                  : undefined
              }
              className={cn(
                "transition-[box-shadow,background-color]",
                commented && "cursor-pointer",
                commented &&
                  !focused &&
                  "shadow-[inset_0_-1px_0_0_var(--rule)]",
                focused &&
                  "bg-paper-deep shadow-[inset_0_-1px_0_0_var(--seal)]",
                lit && !focused && "shadow-[inset_0_-1px_0_0_var(--seal)]",
              )}
            >
              {run.text}
            </span>
          );
        })}
      </span>

      {/*
        Both marks come after the prose in the DOM so `::first-letter` finds a
        letter rather than a numeral, and both are lifted out of the flow into
        the gutters they belong in.
      */}
      <a
        href={`#${anchor}`}
        onClick={(event) => {
          event.preventDefault();
          onCopyAnchor();
        }}
        title="Copy a link to this paragraph"
        className={cn(
          styles.pnum,
          "font-sans text-[9.5px] font-medium tracking-[0.08em] text-ink-faint hover:text-seal",
        )}
      >
        {number}
      </a>

      <button
        type="button"
        onClick={onComment}
        title={
          threads.length > 0
            ? `${threads.length} comment${threads.length === 1 ? "" : "s"} — add another`
            : "Add a comment"
        }
        className={cn(
          styles.cmark,
          threads.length > 0 && styles.cmarkHas,
          "font-sans text-[10px] font-medium text-ink-faint hover:border-seal hover:text-seal",
        )}
      >
        {threads.length > 0 ? threads.length : "+"}
      </button>
    </p>
  );
}

/* ------------------------------------------------------------------ figures */

function InsetFigure({ block }: { block: Block }) {
  const figure = block.figure;
  if (!figure) return null;

  return (
    <figure className="my-9">
      {figure.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={figure.url}
          alt={figure.caption ?? "A photograph from this memoir"}
          className="w-full border border-border object-cover"
        />
      ) : (
        <div className="aspect-3/2 w-full border border-border bg-paper-deep" />
      )}

      <figcaption className="mt-3 flex justify-between gap-5 font-sans text-[9.5px] leading-relaxed font-medium tracking-[0.14em] text-ink-faint uppercase">
        <span>{figure.caption}</span>
        {figure.credit && (
          <span className="whitespace-nowrap">Given by {figure.credit}</span>
        )}
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------- selection */

/**
 * Where a text selection starts and ends, in characters of the block's own
 * text.
 *
 * Walks only the prose span, never the whole paragraph — the gutter numeral
 * and the comment mark are inside the `<p>` too, and counting their characters
 * would offset every anchor by the width of a number.
 *
 * Returns null for anything it cannot measure exactly, including a selection
 * that ends on an element rather than in text. An anchor that is nearly right
 * is worse than none in a document that can never be corrected.
 */
function readSelection(
  prose: HTMLElement | null,
  blockId: string,
): {
  blockId: string;
  start: number;
  end: number;
  left: number;
  top: number;
} | null {
  if (!prose) return null;

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (
    !prose.contains(range.startContainer) ||
    !prose.contains(range.endContainer)
  ) {
    return null;
  }

  const start = characterOffset(prose, range.startContainer, range.startOffset);
  const end = characterOffset(prose, range.endContainer, range.endOffset);
  if (start === null || end === null || end <= start) return null;

  const box = range.getBoundingClientRect();
  return {
    blockId,
    start,
    end,
    left: box.left + box.width / 2,
    top: box.top - 8,
  };
}

function characterOffset(
  root: HTMLElement,
  node: Node,
  offset: number,
): number | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let counted = 0;

  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    if (current === node) return counted + offset;
    counted += current.textContent?.length ?? 0;
  }
  return null;
}
