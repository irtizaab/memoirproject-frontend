"use client";

/**
 * The memoir, read and corrected by its owner before sealing it.
 *
 * A client component, alone in this feature: the owner's credential is a
 * Supabase session in `localStorage`, which a server render cannot see. The
 * whole book is one scrolling page, as it is for the family at `/m/{token}`;
 * an old `/preview/{id}/{chapterId}` address is turned into the same anchor.
 * The comment lane is open to the owner, on their bearer token, and each
 * chapter carries its own "Edit this chapter" toggle.
 */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";

import { useMe } from "@/features/account";
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

export default function PreviewPage({
  params,
}: {
  // A Promise in Next 16, and `use` is how a client component unwraps one.
  params: Promise<{ memoirId: string; page?: string[] }>;
}) {
  const { memoirId, page } = use(params);
  const which = page?.[0];
  const base = `/preview/${memoirId}`;
  const router = useRouter();

  // A part named in the path is a part of the one page now.
  useEffect(() => {
    if (which) router.replace(`${base}#${which}`);
  }, [which, base, router]);

  const reading = useOwnerReading(memoirId);
  const me = useMe();

  if (reading.isLoading) return <Waiting />;
  if (reading.isError) {
    return (
      <Problem
        message={reading.error?.message ?? "That memoir could not be opened."}
      />
    );
  }
  if (!reading.data) return <Waiting />;

  const sealed = Boolean(reading.data.published_at);

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
          <p className="font-sans text-xs text-ink-faint">
            {sealed
              ? "This is your own way in. The family read the same book by link."
              : "Nobody else can open this yet. Sealing it is what hands it to them."}
          </p>
        </div>
      </div>

      <ReaderFrame base={base} reading={reading.data} draft={!sealed}>
        <TitlePage reading={reading.data} />
        {reading.data.chapters.map((chapter) => (
          <PreviewChapter
            key={chapter.id}
            chapterId={chapter.id}
            memoirId={memoirId}
            readerName={me.data?.full_name ?? ""}
            editable={!sealed}
          />
        ))}
        <PeoplePage reading={reading.data} />
        <ColophonPage reading={reading.data} />
      </ReaderFrame>
    </div>
  );
}

/** One chapter of the preview: read, or — until sealed — edited in place. */
function PreviewChapter({
  chapterId,
  memoirId,
  readerName,
  editable,
}: {
  chapterId: string;
  memoirId: string;
  readerName: string;
  editable: boolean;
}) {
  const chapter = useOwnerChapter(chapterId);
  const [editing, setEditing] = useState(false);

  if (!chapter.data) {
    // Keep the part's anchor and place in the rail while it loads.
    return (
      <section id={chapterId} data-page={chapterId} className="py-16 text-center">
        {chapter.isError ? (
          <p className="font-sans text-sm text-seal">{chapter.error.message}</p>
        ) : (
          <Loader2 aria-hidden className="mx-auto size-4 animate-spin text-ink-faint" />
        )}
      </section>
    );
  }

  if (editing) {
    return (
      <PageEditor
        chapter={chapter.data}
        memoirId={memoirId}
        onClose={() => setEditing(false)}
      />
    );
  }

  return (
    <ChapterReader
      token={null}
      reader={null}
      readerName={readerName}
      open
      chapter={chapter.data}
      toolbar={
        editable ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 font-sans text-xs text-ink-soft transition-colors hover:border-ink-faint hover:text-foreground"
          >
            <Pencil aria-hidden className="size-3.5" />
            Edit this chapter
          </button>
        ) : null
      }
    />
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
