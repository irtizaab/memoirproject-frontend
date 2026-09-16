/**
 * An old address for one part of the book — `/m/{token}/{chapterId}`,
 * `/people`, `/colophon` — from when every chapter was its own page.
 *
 * The book is one scrolling page now, so this sends the reader to the same
 * part of it by anchor. Kept because those links were made to be forwarded,
 * and a link in a family group chat does not know the site changed.
 */

import { redirect } from "next/navigation";

export default async function BookPage({
  params,
}: {
  params: Promise<{ token: string; page: string }>;
}) {
  const { token, page } = await params;
  redirect(`/m/${token}#${page}`);
}
