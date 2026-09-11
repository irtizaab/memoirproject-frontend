"use client";

import { PageBody } from "@/components/layout/PageBody";
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
    return (
      <PageBody>
        <p className="font-sans text-sm text-ink-faint">One moment…</p>
      </PageBody>
    );
  }

  if (!memoir) {
    return (
      <PageBody>
        <p className="font-sans text-sm text-ink-soft">
          There is no memoir on this account yet.
        </p>
      </PageBody>
    );
  }

  return (
    <SearchScreen
      source={{ kind: "archive", memoirId: memoir.id }}
      backHref="/archive"
      backLabel="Back to the archive"
      // A hit in the book links into the reader. Published, that is the view
      // link everybody else holds; before that it is the owner's own preview,
      // which is addressed by memoir id and needs no link to exist.
      chapterBase={
        memoir.published_at && memoir.view_token
          ? `/m/${memoir.view_token}`
          : `/preview/${memoir.id}`
      }
      subjectName={memoir.subject_name}
    />
  );
}
