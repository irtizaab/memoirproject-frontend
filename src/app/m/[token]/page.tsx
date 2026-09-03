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
 * Rendered on the server: a view link needs no browser-held credential, so a
 * family opening this on a phone gets the words in the first response rather
 * than a spinner.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookCover, ReaderFrame } from "@/features/memoir";
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

  let reading;
  try {
    reading = await fetchReading(token);
  } catch (error) {
    // 404 means the token is unknown, revoked, or is a contribute link rather
    // than a view link. It does not say which, and neither does this page.
    // Anything else — the backend down, a contract mismatch — is a real fault
    // and should surface rather than be disguised as a missing page.
    if (isApiError(error) && error.status === 404) notFound();
    throw error;
  }

  return (
    <ReaderFrame token={token} reading={reading} currentChapterId={null}>
      <BookCover token={token} reading={reading} />
    </ReaderFrame>
  );
}
