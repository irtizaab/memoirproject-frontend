"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Loader2, Plus, Undo2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import {
  formatHappenedOn,
  labelForKind,
  useCreateMemory,
  useMemories,
  type Memory,
} from "@/features/archive";
import type { MediaAsset } from "@/features/media";
import { useEditChapter } from "@/features/memoir/hooks";
import styles from "@/features/memoir/reader.module.css";
import type { Block, Chapter } from "@/features/memoir/schemas";
import { credit, roman } from "@/features/memoir/utils";

/**
 * The page, with the owner's hands on it — the editable twin of
 * `ChapterReader`, at the same address, one toggle apart.
 *
 * Reword, reorder, remove, rename the chapter, move a photograph beside
 * another paragraph, add a section, and add a single photograph from the
 * archive to the carousel. A section is always a memory: one picked from the
 * archive, or one the owner writes here, which is saved to the archive first.
 * So every passage still has a person behind it — and a photograph added on
 * its own keeps the caption and credit of the memory it was sent with.
 *
 * The whole page is saved at once, because reordering is a sequence of moves
 * and each save would be a complete page able to fail halfway.
 */

/**
 * A memory waiting to become blocks, or one photograph of it waiting to
 * become a figure. Rows exist only after saving.
 */
type Pending = { pending: true; key: string; memory: Memory; asset?: MediaAsset };
type Row = Block | Pending;

const isPending = (row: Row): row is Pending => "pending" in row;

/** What a memory would put on the page, or why it cannot yet. */
function placeable(memory: Memory): string | null {
  if (memory.body_text?.trim()) return null;
  const audio = memory.assets.filter((a) => a.kind === "audio");
  if (audio.some((a) => a.transcript?.status === "done")) return null;
  if (memory.assets.some((a) => a.kind === "image")) return null;
  return audio.length ? "not transcribed yet" : "nothing to place";
}

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
  const [draft, setDraft] = useState<Row[]>(chapter.blocks);
  // Where the "add" panel is open: the index a new section goes in at.
  const [adding, setAdding] = useState<number | null>(null);

  const paragraphs = draft.filter(
    (row): row is Block => !isPending(row) && row.kind === "paragraph",
  );

  const dirty =
    title !== chapter.title ||
    draft.length !== chapter.blocks.length ||
    draft.some((row, index) => {
      const was = chapter.blocks[index];
      return (
        !was ||
        isPending(row) ||
        was.id !== row.id ||
        was.text !== row.text ||
        was.figure?.anchor_block_id !== row.figure?.anchor_block_id
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
    next[index] = { ...next[index], ...changed } as Row;
    setDraft(next);
  };

  const remove = (index: number) => {
    const going = draft[index];
    setDraft(
      draft.filter((row, position) => {
        if (position === index) return false;
        // A photograph cannot outlive the paragraph it sits beside.
        if (isPending(row) || isPending(going)) return true;
        return row.figure?.anchor_block_id !== going.id;
      }),
    );
  };

  const insert = (index: number, memory: Memory, asset?: MediaAsset) => {
    const next = [...draft];
    next.splice(index, 0, {
      pending: true,
      key: `${asset?.id ?? memory.id}:${draft.filter(isPending).length}`,
      memory,
      asset,
    });
    setDraft(next);
    setAdding(null);
  };

  // Photographs already on the page, or waiting to be: offered nowhere twice.
  const placed = new Set(
    draft.map((row) => (isPending(row) ? row.asset?.id : row.figure?.asset_id)),
  );

  const submit = () => {
    save.mutate(
      {
        title,
        blocks: draft.map((row) =>
          isPending(row)
            ? row.asset
              ? { asset_id: row.asset.id }
              : { memory_id: row.memory.id }
            : {
                id: row.id,
                ...(row.kind === "figure"
                  ? { anchor_block_id: row.figure?.anchor_block_id }
                  : { text: row.text ?? "" }),
              },
        ),
      },
      { onSuccess: onClose },
    );
  };

  const addHere = (index: number) => (
    <li key={`add:${index}`} className="py-1">
      {adding === index ? (
        <AddSection
          memoirId={memoirId}
          placed={placed}
          onPick={(memory, asset) => insert(index, memory, asset)}
          onClose={() => setAdding(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(index)}
          className="inline-flex items-center gap-1.5 font-sans text-xs text-ink-faint transition-colors hover:text-seal"
        >
          <Plus aria-hidden className="size-3.5" />
          Add a section here
        </button>
      )}
    </li>
  );

  return (
    <section id={chapter.id} data-page={chapter.id} className={styles.page}>
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
          Change any words and the credit beside them follows: where the exact
          phrase somebody supplied is gone, their name stays on the whole
          passage.
        </p>
      </header>

      <ol className="space-y-3">
        {addHere(0)}
        {draft.flatMap((row, index) => [
          <li
            key={isPending(row) ? row.key : row.id}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <span className="font-sans text-[9.5px] font-medium tracking-[0.16em] text-ink-faint uppercase">
                {isPending(row)
                  ? row.asset
                    ? "New photograph"
                    : "New section"
                  : row.kind === "figure"
                    ? row.figure?.medium === "audio"
                      ? "Recording"
                      : "Photograph"
                    : row.kind === "pull"
                      ? "Pulled line"
                      : `Passage ${index + 1}`}
              </span>

              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  label={`Move ${describe(row, index)} earlier`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp aria-hidden className="size-4" />
                </IconButton>
                <IconButton
                  label={`Move ${describe(row, index)} later`}
                  disabled={index === draft.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown aria-hidden className="size-4" />
                </IconButton>
                <IconButton
                  label={`Leave ${describe(row, index)} out`}
                  disabled={
                    !isPending(row) &&
                    row.kind === "paragraph" &&
                    paragraphs.length === 1 &&
                    !draft.some(isPending)
                  }
                  onClick={() => remove(index)}
                >
                  <X aria-hidden className="size-4" />
                </IconButton>
              </div>
            </div>

            {isPending(row) ? (
              row.asset ? (
                <PendingAsset asset={row.asset} memory={row.memory} />
              ) : (
                <PendingRow memory={row.memory} />
              )
            ) : row.kind === "figure" ? (
              <FigureRow
                block={row}
                paragraphs={paragraphs}
                onChange={(anchor_block_id) =>
                  update(index, {
                    figure: row.figure ? { ...row.figure, anchor_block_id } : null,
                  })
                }
              />
            ) : (
              <>
                <textarea
                  aria-label={`Passage ${index + 1}`}
                  value={row.text ?? ""}
                  onChange={(event) =>
                    update(index, { text: event.target.value })
                  }
                  rows={Math.min(
                    14,
                    Math.ceil((row.text?.length ?? 0) / 70) + 2,
                  )}
                  className="w-full resize-y rounded-xl border border-border bg-paper-deep px-3.5 py-3 font-heading text-[16.5px] leading-[1.7] font-light text-foreground focus:border-seal focus:bg-card focus:outline-none"
                />
                {row.sources.length > 0 && (
                  <p className="mt-2.5 font-sans text-[10.5px] leading-relaxed text-ink-faint">
                    From{" "}
                    {row.sources
                      .map((source) => `${source.name} (${credit(source)})`)
                      .join(" · ")}
                  </p>
                )}
              </>
            )}
          </li>,
          addHere(index + 1),
        ])}
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
    </section>
  );
}

/** Choose a memory from the archive, or write one and place it. */
function AddSection({
  memoirId,
  placed,
  onPick,
  onClose,
}: {
  memoirId: string;
  /** Asset ids already on the page, which the photograph list leaves out. */
  placed: Set<string | undefined>;
  onPick: (memory: Memory, asset?: MediaAsset) => void;
  onClose: () => void;
}) {
  const memories = useMemories(memoirId);
  const create = useCreateMemory(memoirId);
  const [text, setText] = useState("");

  // Every photograph in the archive not yet on this page, with the memory it
  // came with — that memory is where its caption and credit will come from.
  const photographs = (memories.data ?? []).flatMap((memory) =>
    memory.assets
      .filter((asset) => asset.kind === "image" && !placed.has(asset.id))
      .map((asset) => ({ memory, asset })),
  );

  const write = () => {
    create.mutate(
      { body_text: text.trim() },
      { onSuccess: (memory) => onPick(memory) },
    );
  };

  return (
    <div className="rounded-2xl border border-seal bg-paper-deep p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow-muted">Add a section</p>
        <IconButton label="Close" onClick={onClose}>
          <X aria-hidden className="size-4" />
        </IconButton>
      </div>

      <label className="mt-3 block">
        <span className="font-sans text-xs text-ink-soft">In your own words</span>
        <textarea
          aria-label="New section"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          className="mt-1.5 w-full resize-y rounded-xl border border-border bg-card px-3.5 py-3 font-heading text-[16.5px] leading-[1.7] font-light text-foreground focus:border-seal focus:outline-none"
        />
      </label>
      <Button
        size="sm"
        className="mt-2"
        disabled={!text.trim() || create.isPending}
        onClick={write}
      >
        {create.isPending ? "Saving…" : "Save to the archive and place it"}
      </Button>
      {create.isError && (
        <p className="mt-2 font-sans text-xs text-seal">
          {create.error.message}
        </p>
      )}

      <p className="mt-5 font-sans text-xs text-ink-soft">From the archive</p>
      <ul className="mt-1.5 max-h-72 space-y-1 overflow-y-auto">
        {memories.data?.map((memory) => {
          const why = placeable(memory);
          const words = memory.title || memory.body_text || "";
          return (
            <li key={memory.id}>
              <button
                type="button"
                disabled={why !== null}
                onClick={() => onPick(memory)}
                className="w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="block font-sans text-[9.5px] font-medium tracking-[0.14em] text-ink-faint uppercase">
                  {labelForKind(memory.kind)} · {memory.contributor_name}
                  {formatHappenedOn(memory.happened_on) &&
                    ` · ${formatHappenedOn(memory.happened_on)}`}
                  {why && ` · ${why}`}
                </span>
                <span className="mt-0.5 line-clamp-2 block font-heading text-sm text-foreground">
                  {words || `${memory.assets.length} photograph(s)`}
                </span>
              </button>
            </li>
          );
        })}
        {memories.data?.length === 0 && (
          <li className="px-2.5 py-2 font-sans text-xs text-ink-faint">
            The archive is empty.
          </li>
        )}
      </ul>

      {photographs.length > 0 && (
        <>
          <p className="mt-5 font-sans text-xs text-ink-soft">
            A photograph on its own — it joins the pictures after the passage
            above
          </p>
          <ul className="mt-1.5 grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-5">
            {photographs.map(({ memory, asset }) => (
              <li key={asset.id}>
                <button
                  type="button"
                  onClick={() => onPick(memory, asset)}
                  aria-label={`Add the photograph ${memory.title ?? `from ${memory.contributor_name}`}`}
                  className="block aspect-square w-full overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-seal focus:border-seal focus:outline-none"
                >
                  {asset.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="block size-full bg-paper-deep" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-4 font-sans text-xs leading-relaxed text-ink-faint">
        New photographs and recordings come in through the archive —{" "}
        <Link href="/archive/new" className="underline hover:text-seal">
          add them as a memory
        </Link>{" "}
        first.
      </p>
    </div>
  );
}

function PendingRow({ memory }: { memory: Memory }) {
  const words = memory.body_text?.trim();
  const images = memory.assets.filter((a) => a.kind === "image").length;
  const recordings = memory.assets.filter(
    (a) => a.kind === "audio" && a.transcript?.status === "done",
  ).length;
  const placed = [
    images && `${images} photograph(s)`,
    recordings && `${recordings} recording(s)`,
  ]
    .filter(Boolean)
    .join(" and ");
  return (
    <div className="font-sans text-sm text-ink-soft">
      <p className="line-clamp-3 font-heading text-[16.5px] leading-[1.7] font-light text-foreground">
        {words ??
          (recordings
            ? `The recording's words, then ${placed}`
            : `${placed}, beside the passage above`)}
      </p>
      <p className="mt-1.5 text-[10.5px] text-ink-faint">
        From {memory.contributor_name}
        {placed && words && ` · ${placed} follow it`}
      </p>
    </div>
  );
}

/** One photograph waiting to join the carousel after the passage above. */
function PendingAsset({ asset, memory }: { asset: MediaAsset; memory: Memory }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {asset.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.url}
          alt={memory.title ?? "A photograph from this memoir"}
          className="h-24 w-32 shrink-0 rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="h-24 w-32 shrink-0 rounded-lg border border-border bg-paper-deep" />
      )}
      <p className="font-sans text-[10.5px] leading-relaxed text-ink-faint">
        Joins the pictures after the passage above
        <br />
        From {memory.contributor_name}
        {memory.title && ` · “${memory.title}”`}
      </p>
    </div>
  );
}

/** A photograph or recording, and which paragraph it belongs beside. */
function FigureRow({
  block,
  paragraphs,
  onChange,
}: {
  block: Block;
  paragraphs: Block[];
  onChange: (anchor_block_id: string) => void;
}) {
  const figure = block.figure;
  if (!figure) return null;

  return (
    <div className="flex flex-wrap gap-4">
      {figure.medium === "audio" ? (
        <audio
          controls
          preload="none"
          src={figure.url ?? undefined}
          aria-label={
            figure.credit ? `Recording by ${figure.credit}` : "A recording"
          }
          className="h-8 w-64 shrink-0"
        />
      ) : figure.url ? (
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
          <span className="eyebrow-muted">Beside</span>
          <select
            value={figure.anchor_block_id}
            onChange={(event) => onChange(event.target.value)}
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
          </p>
        )}
      </div>
    </div>
  );
}

function describe(row: Row, index: number): string {
  if (isPending(row)) return row.asset ? "this photograph" : "this new section";
  if (row.kind === "figure") return "this photograph";
  if (row.kind === "pull") return "this pulled line";
  return `passage ${index + 1}`;
}
