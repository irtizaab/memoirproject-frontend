/**
 * One chapter.
 *
 * A route rather than a client-side tab, so a chapter is a **unit**: it has its
 * own address, it survives a refresh, the back button does the obvious thing,
 * and a granddaughter can send somebody one chapter rather than "scroll down a
 * bit". The paragraph anchors inside it are durable for the same reason —
 * a published memoir never changes, so `#p4` points at the same words forever.
 *
 * Both requests are made on the server and in parallel. The covers are needed
 * for the contents rail and the lifespan mark; the chapter is the page.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChapterReader, ReaderFrame } from "@/features/memoir";
import { fetchChapter, fetchReading } from "@/features/memoir/server";
import { isApiError } from "@/lib/api/errors";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string; chapterId: string }>;
}): Promise<Metadata> {
  const { token, chapterId } = await params;

  try {
    const chapter = await fetchChapter(token, chapterId);
    return { title: chapter.title };
  } catch {
    // A title is not worth a 500. The page below decides what a failure means.
    return { title: "A memoir" };
  }
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ token: string; chapterId: string }>;
}) {
  const { token, chapterId } = await params;

  let reading;
  let chapter;
  try {
    [reading, chapter] = await Promise.all([
      fetchReading(token),
      fetchChapter(token, chapterId),
    ]);
  } catch (error) {
    // 404 covers a dead link, a wrong-scope link, and a chapter belonging to
    // somebody else's memoir. Deliberately undistinguished — the backend does
    // not tell them apart either.
    if (isApiError(error) && error.status === 404) notFound();
    throw error;
  }

  return (
    <ReaderFrame token={token} reading={reading} currentChapterId={chapter.id}>
      <ChapterReader token={token} reading={reading} chapter={chapter} />
    </ReaderFrame>
  );
}
