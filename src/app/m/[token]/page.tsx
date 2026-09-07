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
 * `max-w-5xl` could not hold.
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

import { BookCover, MemoirGate, ReaderFrame } from "@/features/memoir";
import { readReaderSession } from "@/features/memoir/readerSession";
import { fetchReading } from "@/features/memoir/server";
import { isApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "A memoir" };

export default async function MemoirPage({
  params,
}: {
  // A Promise in Next 16 — dynamic params are awaited, not read directly.
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const reader = readReaderSession((await cookies()).toString(), token);

  // No session at all: nothing has been asked of the backend, and nothing has
  // been given away. The door does not say whether this link is real.
  if (!reader) return <MemoirGate token={token} subjectName={null} />;

  let reading;
  try {
    reading = await fetchReading(token, reader);
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
    <ReaderFrame token={token} reading={reading} currentChapterId={null}>
      <BookCover token={token} reading={reading} />
    </ReaderFrame>
  );
}
