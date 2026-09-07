"use client";

import { useActiveMemoir } from "@/features/account";
import { SearchScreen } from "@/features/search/components/SearchScreen";

/**
 * The owner's half of search: everything except which memoir.
 *
 * A component rather than logic in the page, because `useActiveMemoir` is a
 * client hook — the archive's every endpoint is authenticated with a token held
 * in the browser, so there is nothing for a server render to do here.
 */
export function OwnerSearch() {
  const { memoir, isPending } = useActiveMemoir();

  if (isPending) {
    return <p className="font-sans text-sm text-ink-faint">One moment…</p>;
  }

  if (!memoir) {
    return (
      <p className="font-sans text-sm text-ink-soft">
        There is no memoir on this account yet.
      </p>
    );
  }

  return (
    <SearchScreen
      source={{ kind: "archive", memoirId: memoir.id }}
      backHref="/archive"
      backLabel="Back to the archive"
      // A hit in the book links into the reader, which the owner reaches by
      // the same view link everybody else does. Before publication there is no
      // link, so a result says what it found and stops there.
      chapterHref={
        memoir.view_token
          ? (chapterId) => `/m/${memoir.view_token}/${chapterId}`
          : null
      }
      subjectName={memoir.subject_name}
    />
  );
}
