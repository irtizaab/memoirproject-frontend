"use client";

/**
 * The memoir, read by the person whose memoir it is, before they seal it.
 *
 * ---------------------------------------------------------------------------
 * Why this route exists
 * ---------------------------------------------------------------------------
 * Sealing is irreversible. `BookPanel` said "read it through before sealing
 * it" and offered no way to do it: the reader is addressed by a **view** link,
 * and `publish_memoir` is what creates one. So the only way to see what a
 * family would read was to publish it to them first, which is the one step
 * that cannot be taken back.
 *
 * The backend was already ready — `GET /memoirs/{id}/chapters` exists for this,
 * and `_reachable_chapter` tries the owner's credential before any link
 * precisely so an unpublished chapter is readable by its owner. Only the screen
 * was missing.
 *
 * ---------------------------------------------------------------------------
 * Why it is a client component, alone in this feature
 * ---------------------------------------------------------------------------
 * The owner's credential is a Supabase session in `localStorage`, which a
 * server render cannot see. The family's copy stays server-rendered: they
 * arrive holding a cookie, and the prose lands in the first response.
 *
 * ---------------------------------------------------------------------------
 * Why one route with an optional catch-all
 * ---------------------------------------------------------------------------
 * `/preview/{id}`, `/preview/{id}/{chapterId}`, `/preview/{id}/people` and
 * `/preview/{id}/colophon` are the same three fetches and the same frame,
 * differing only in what fills the column. Four files would have been four
 * copies of the loading and error states.
 *
 * There is **no comment layer here**, and that is not a simplification: a
 * comment is left by somebody holding the link, against a passage that can
 * never move. Neither exists yet. `ChapterReader` takes a null token and draws
 * the prose and the margin, which is what the owner is checking.
 *
 * ---------------------------------------------------------------------------
 * And it is where the book is corrected
 * ---------------------------------------------------------------------------
 * A chapter page carries an "Edit this page" toggle that swaps the reader for
 * `PageEditor` at the same address. Nothing rewrites itself on the owner's
 * behalf: the only automatic action in the product is building the book, back
 * in the archive — the button or the guide — and it rebuilds from the outline.
 * Everything else here is theirs to change by hand.
 */

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";

import {
  ChapterReader,
  ColophonPage,
  PageEditor,
  PeoplePage,
  ReaderFrame,
  TitlePage,
  useOwnerChapter,
  useOwnerReading,
} from "@/features/memoir";

const MATTER = ["people", "colophon"] as const;

type Matter = (typeof MATTER)[number];

const isMatter = (page: string | undefined): page is Matter =>
  MATTER.includes(page as Matter);

export default function PreviewPage({
  params,
}: {
  // A Promise in Next 16, and `use` is how a client component unwraps one.
  params: Promise<{ memoirId: string; page?: string[] }>;
}) {
  const { memoirId, page } = use(params);
  const which = page?.[0];
  const chapterId = isMatter(which) ? null : (which ?? null);

  const base = `/preview/${memoirId}`;
  const reading = useOwnerReading(memoirId);
  const chapter = useOwnerChapter(chapterId);
  const [editing, setEditing] = useState(false);

  // A disabled query (no chapter in the URL) stays `isPending` forever in
  // TanStack v5, so wait on `isLoading` — pending *and* fetching.
  if (reading.isLoading || chapter.isLoading) return <Waiting />;

  // 404 is also what a memoir belonging to somebody else answers, so this says
  // the same thing for both rather than guessing which one happened.
  if (reading.isError || chapter.isError) {
    return (
      <Problem
        message={
          reading.error?.message ??
          chapter.error?.message ??
          "That memoir could not be opened."
        }
      />
    );
  }

  const current = isMatter(which) ? which : (chapter.data?.id ?? null);
  if (!reading.data) return <Waiting />;
  const sealed = Boolean(reading.data.published_at);
  // Editing is refused outright once the memoir is sealed, so the toggle is
  // absent rather than disabled there — the same rule the backend answers 409
  // for, said before the owner can run into it.
  const editable = Boolean(chapter.data) && !sealed;

  return (
    <div>
      <div className="border-b border-border/70 bg-paper-deep">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Link
            href="/archive"
            className="inline-flex items-center gap-2 font-sans text-xs text-ink-soft transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            Back to the archive
          </Link>
          <span className="flex flex-wrap items-center gap-4">
            {editable && (
              <button
                type="button"
                onClick={() => setEditing((was) => !was)}
                aria-pressed={editing}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 font-sans text-xs text-ink-soft transition-colors hover:border-ink-faint hover:text-foreground"
              >
                <Pencil aria-hidden className="size-3.5" />
                {editing ? "Read it instead" : "Edit this page"}
              </button>
            )}
            <p className="font-sans text-xs text-ink-faint">
              {sealed
                ? "This is your own way in. The family read the same book by link."
                : "Nobody else can open this yet. Sealing it is what hands it to them."}
            </p>
          </span>
        </div>
      </div>

      <ReaderFrame
        base={base}
        reading={reading.data}
        currentPage={current}
        draft={!reading.data.published_at}
      >
        {isMatter(which) ? (
          which === "people" ? (
            <PeoplePage base={base} reading={reading.data} />
          ) : (
            <ColophonPage base={base} reading={reading.data} />
          )
        ) : chapter.data ? (
          editing ? (
            /* Keyed on the chapter so moving to another page hands the editor
               a fresh draft rather than one holding the last page's blocks. */
            <PageEditor
              key={chapter.data.id}
              chapter={chapter.data}
              memoirId={memoirId}
              onClose={() => setEditing(false)}
            />
          ) : (
            <ChapterReader
              base={base}
              token={null}
              reader={null}
              readerName=""
              reading={reading.data}
              chapter={chapter.data}
            />
          )
        ) : (
          <TitlePage base={base} reading={reading.data} />
        )}
      </ReaderFrame>
    </div>
  );
}

function Waiting() {
  return (
    <p className="flex min-h-svh items-center justify-center gap-3 font-sans text-sm text-ink-faint">
      <Loader2 aria-hidden className="size-4 animate-spin" />
      Opening the book…
    </p>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-prose px-5 py-24 text-center">
      <p className="font-heading text-xl leading-snug font-normal">{message}</p>
      <Link
        href="/archive"
        className="mt-6 inline-flex items-center gap-2 font-sans text-sm text-ink-soft transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        Back to the archive
      </Link>
    </div>
  );
}
