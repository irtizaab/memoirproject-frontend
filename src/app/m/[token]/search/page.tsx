/**
 * Searching the memoir, from inside the book.
 *
 * Server-rendered as far as the door: the session comes out of the cookie
 * here, and somebody without one is asked for the passphrase exactly as they
 * would be on any other page of the reader. The search itself is a client
 * component, because results change in response to what a person is typing.
 */

import type { Metadata } from "next";
import { cookies } from "next/headers";

import { MemoirGate } from "@/features/memoir";
import { readReaderSession } from "@/features/memoir/readerSession";
import { SearchScreen } from "@/features/search";

export const metadata: Metadata = { title: "Search this memoir" };

export default async function ReaderSearchPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const reader = readReaderSession((await cookies()).toString(), token);

  if (!reader) return <MemoirGate token={token} subjectName={null} />;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
      <SearchScreen
        source={{ kind: "reader", token, reader }}
        backHref={`/m/${token}`}
        backLabel="Back to the memoir"
        chapterHref={(chapterId) => `/m/${token}/${chapterId}`}
        subjectName={null}
      />
    </main>
  );
}
