/**
 * The finished memoir, opened by a view link — the frontend twin of the
 * backend's `GET /r/{token}`.
 *
 * `/m/` is short for the same reason `/j/` is: this URL gets forwarded in
 * WhatsApp messages and read aloud over the phone, so every character is one
 * more chance to mistype it.
 *
 * Outside the `(app)` route group and with its own chrome, because the people
 * this is for have no account and never will. It is also the only screen in
 * the product wider than a single column, which the `(app)` shell's centred
 * `max-w-7xl` could not hold.
 *
 * **The whole book is this one page**: title, every chapter in order, the
 * people, the colophon. The contents rail scrolls to a part rather than
 * navigating to it, and `#{chapterId}` is what a granddaughter sends somebody
 * for "the bit about the piano". The covers and every chapter are fetched on
 * the server, in parallel.
 *
 * Rendered on the server, still — the reader session lives in a cookie rather
 * than `localStorage` precisely so that it arrives with the request and a
 * family opening this on a phone gets the words in the first response.
 * Somebody without one gets the door instead, which is the only client
 * component on this route.
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
  TitlePage,
} from "@/features/memoir";
import {
  readReaderName,
  readReaderSession,
} from "@/features/memoir/readerSession";
import { fetchChapter, fetchReading } from "@/features/memoir/server";
import { isApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "A memoir" };

export default async function MemoirPage({
  params,
}: {
  // A Promise in Next 16 — dynamic params are awaited, not read directly.
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const jar = (await cookies()).toString();
  const reader = readReaderSession(jar, token);
  const readerName = readReaderName(jar, token);

  // No session at all: nothing has been asked of the backend, and nothing has
  // been given away. The door does not say whether this link is real.
  if (!reader) return <MemoirGate token={token} subjectName={null} />;

  let reading;
  let chapters;
  try {
    reading = await fetchReading(token, reader);
    chapters = await Promise.all(
      reading.chapters.map((chapter) => fetchChapter(token, chapter.id, reader)),
    );
  } catch (error) {
    // A session that no longer holds — the passphrase was replaced, the link
    // reissued — comes back as the same 404 as a link that never existed. Show
    // the door rather than a missing page: a family whose passphrase changed
    // should be asked for the new one, not told their memoir is gone.
    if (isApiError(error) && error.status === 404) {
      return <MemoirGate token={token} subjectName={null} />;
    }
    throw error;
  }

  if (!reading) notFound();

  return (
    <ReaderFrame base={`/m/${token}`} reading={reading}>
      <TitlePage reading={reading} />
      {chapters.map((chapter) => (
        <ChapterReader
          key={chapter.id}
          token={token}
          reader={reader}
          readerName={readerName}
          open
          chapter={chapter}
        />
      ))}
      <PeoplePage reading={reading} />
      <ColophonPage reading={reading} />
    </ReaderFrame>
  );
}
