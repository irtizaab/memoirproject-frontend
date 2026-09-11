/**
 * One page of the book: a chapter, the people, or the colophon.
 *
 * A route rather than a client-side tab, so a page is a **unit**: it has its
 * own address, it survives a refresh, the back button does the obvious thing,
 * and a granddaughter can send somebody one chapter rather than "scroll down a
 * bit". The paragraph anchors inside it are durable for the same reason —
 * a published memoir never changes, so `#p4` points at the same words forever.
 *
 * The two matter pages come through here rather than through routes of their
 * own because they need exactly what a chapter needs — the session, the
 * covers, the frame — and differ only in what fills the column. `people` and
 * `colophon` are not ids anything can collide with: a chapter id is a UUID.
 *
 * Both requests are made on the server and in parallel. The covers are needed
 * for the contents rail and the lifespan mark; the chapter is the page.
 */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import {
  ChapterReader,
  ColophonPage,
  MemoirGate,
  PeoplePage,
  ReaderFrame,
} from "@/features/memoir";
import {
  readReaderName,
  readReaderSession,
} from "@/features/memoir/readerSession";
import { fetchChapter, fetchReading } from "@/features/memoir/server";
import { isApiError } from "@/lib/api/errors";

/** The back matter, which is addressed by name rather than by id. */
const MATTER = { people: "The people", colophon: "Colophon" } as const;

type Matter = keyof typeof MATTER;

const isMatter = (page: string): page is Matter => page in MATTER;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string; page: string }>;
}): Promise<Metadata> {
  const { token, page } = await params;
  if (isMatter(page)) return { title: MATTER[page] };

  const reader = readReaderSession((await cookies()).toString(), token);
  if (!reader) return { title: "A memoir" };

  try {
    const chapter = await fetchChapter(token, page, reader);
    return { title: chapter.title };
  } catch {
    // A title is not worth a 500. The page below decides what a failure means.
    return { title: "A memoir" };
  }
}

export default async function BookPage({
  params,
}: {
  // A Promise in Next 16 — dynamic params are awaited, not read directly.
  params: Promise<{ token: string; page: string }>;
}) {
  const { token, page } = await params;
  const jar = (await cookies()).toString();
  const reader = readReaderSession(jar, token);
  const readerName = readReaderName(jar, token);
  const base = `/m/${token}`;

  // Somebody who followed a link straight to a page is asked at the door like
  // everybody else, and lands back here once it opens.
  if (!reader) return <MemoirGate token={token} subjectName={null} />;

  let reading;
  let chapter;
  try {
    [reading, chapter] = await Promise.all([
      fetchReading(token, reader),
      isMatter(page) ? null : fetchChapter(token, page, reader),
    ]);
  } catch (error) {
    // 404 covers a dead link, a wrong-scope link, a session that no longer
    // holds, and a chapter belonging to somebody else's memoir. Deliberately
    // undistinguished — the backend does not tell them apart either — except
    // that a caller who has a session and lost it is worth sending to the door
    // rather than to a missing page.
    if (isApiError(error) && error.status === 404) {
      return <MemoirGate token={token} subjectName={null} />;
    }
    throw error;
  }

  if (isMatter(page)) {
    return (
      <ReaderFrame base={base} reading={reading} currentPage={page}>
        {page === "people" ? (
          <PeoplePage base={base} reading={reading} />
        ) : (
          <ColophonPage base={base} reading={reading} />
        )}
      </ReaderFrame>
    );
  }

  if (!chapter) notFound();

  return (
    <ReaderFrame base={base} reading={reading} currentPage={chapter.id}>
      <ChapterReader
        base={base}
        token={token}
        reader={reader}
        readerName={readerName}
        reading={reading}
        chapter={chapter}
      />
    </ReaderFrame>
  );
}
