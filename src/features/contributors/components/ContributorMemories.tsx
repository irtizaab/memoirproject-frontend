"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { useActiveMemoir } from "@/features/account";
import { MemoryCard, useMemories } from "@/features/archive";
import { useContributors } from "@/features/contributors/hooks";

/**
 * Everything one person has added, on its own page.
 *
 * The contributors list answers "who is in this memoir". This answers "what did
 * they leave", which is the question the owner actually has when a name they
 * do not recognise appears on the list — and the one the product had no way to
 * answer.
 *
 * It reads from the archive rather than from a new endpoint. `GET /memoirs/
 * {id}/memories` already returns every memory with the `participant_id` that
 * left it, so this is a filter over data the archive has usually already
 * fetched — the page is typically instant, and there is no second way for the
 * two lists to disagree.
 *
 * Filtered on the id and never on the name. Two people who share a name are two
 * people; that is what the merge flow on the contributors screen is for.
 *
 * Delete is not repeated here. Each card links to the memory itself, where
 * deleting already lives behind a confirm — putting a second delete control on
 * a grid is exactly what that page's design deliberately avoided.
 */
export function ContributorMemories({ participantId }: { participantId: string }) {
  const { memoir } = useActiveMemoir();
  const { data: contributors } = useContributors(memoir?.id ?? null);
  const { data: memories, isPending, error } = useMemories(memoir?.id ?? null);

  const person = contributors?.participants.find(
    (participant) => participant.id === participantId,
  );

  const theirs = (memories ?? []).filter(
    (memory) => memory.participant_id === participantId,
  );

  if (isPending && !memories) {
    return <p className="font-sans text-sm text-ink-faint">Opening…</p>;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Contributors"
          title="That could not be opened."
          description="Something went wrong reaching the archive. Trying again usually settles it."
        />
        <Link
          href="/contributors"
          className={buttonVariants({ variant: "outline" })}
        >
          <ArrowLeft aria-hidden />
          Back to contributors
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <Link
        href="/contributors"
        className="inline-flex items-center gap-2 font-sans text-sm text-ink-soft transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Contributors
      </Link>

      <PageHeader
        eyebrow={person?.role === "owner" ? "You" : "A contributor"}
        title={person?.display_name ?? "This contributor"}
        description={
          theirs.length === 0
            ? "Nothing added yet."
            : theirs.length === 1
              ? "One memory, below. Open it to read it in full or remove it."
              : `${theirs.length} memories, below. Open one to read it in full or remove it.`
        }
      />

      {theirs.length > 0 && (
        <ul className="grid gap-6 sm:grid-cols-2">
          {theirs.map((memory) => (
            <li key={memory.id}>
              <MemoryCard memory={memory} />
            </li>
          ))}
        </ul>
      )}

      {theirs.length === 0 && (
        <p className="font-heading text-sm italic text-ink-soft">
          They have opened the link. Nothing has arrived yet, and that is a
          normal place for this to sit.
        </p>
      )}
    </div>
  );
}
