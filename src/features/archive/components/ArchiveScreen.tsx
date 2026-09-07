"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { useActiveMemoir } from "@/features/account";
import { BookPanel } from "@/features/archive/components/BookPanel";
import { InviteBanner } from "@/features/archive/components/InviteBanner";
import { MemoryCard } from "@/features/archive/components/MemoryCard";
import { useMemories } from "@/features/archive/hooks";
import {
  archiveTitle,
  formatYears,
} from "@/features/archive/utils";

/**
 * The archive: what has been collected, and how to collect more.
 *
 * A client component because everything on it is authenticated with a token
 * held in the browser. The page under `app/(app)/archive/` stays thin and
 * renders this.
 */
export function ArchiveScreen() {
  const { memoir, isPending: memoirPending } = useActiveMemoir();
  const { data: memories, isPending: memoriesPending } = useMemories(
    memoir?.id ?? null,
  );

  const years = memoir ? formatYears(memoir) : null;

  // Someone who signed up but never finished onboarding. A real state, and the
  // only useful thing to say is where to go.
  if (!memoirPending && !memoir) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Your living archive"
          title="There is no memoir here yet."
          description="You have an account, but no memoir has been created against it."
        />
        <Link href="/onboarding" className={buttonVariants()}>
          Start a memoir
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="The archive"
        title={archiveTitle(memoir)}
        description={
          <>
            Collect the voices, images, and fragments that deserve a longer
            life. Every memory is yours to shape, revisit, and share.
            {years && (
              <span className="mt-2 block text-ink-faint">{years}</span>
            )}
          </>
        }
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search is here rather than in the header, because it searches
                this memoir and the header belongs to the account. */}
            <Link
              href="/search"
              className={buttonVariants({ variant: "outline" })}
            >
              <Search aria-hidden />
              Search
            </Link>
            <Link href="/archive/new" className={buttonVariants()}>
              <Plus aria-hidden />
              New memory
            </Link>
          </div>
        }
      />

      {/*
        The owner's own answer to "what must never be forgotten about them",
        given at signup. It appears here and nowhere a contributor can see it —
        the backend's `response_model` on `GET /j/{token}` filters it out.
      */}
      {memoir?.never_forget && (
        <blockquote className="border-l-2 border-seal pl-5 font-heading text-lg leading-relaxed italic text-ink-soft">
          {memoir.never_forget}
        </blockquote>
      )}

      <BookPanel memoir={memoir ?? null} />

      <InviteBanner linkToken={memoir?.link_token ?? null} />

      <section className="space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-heading text-2xl font-normal">
            Recent memories
          </h2>
          {memories && memories.length > 0 && (
            <p className="eyebrow-muted">
              {memories.length} held here
            </p>
          )}
        </div>

        {memoriesPending || memoirPending ? (
          <p className="font-sans text-sm text-ink-faint">
            Gathering what has been collected…
          </p>
        ) : memories && memories.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {memories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} />
            ))}
          </div>
        ) : (
          /*
            The state every new owner sees first, and the one worth getting
            right. One quiet line and the two things there are to do — not an
            empty grid, and certainly not a progress bar telling somebody their
            grandmother's memoir is 0% complete.
          */
          <p className="font-sans text-sm leading-relaxed text-muted-foreground">
            Nothing has been added yet. Share the link above, or{" "}
            <Link href="/archive/new" className="text-seal underline underline-offset-4">
              write the first memory yourself
            </Link>
            .
          </p>
        )}
      </section>

      {memories && memories.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <p className="font-heading text-sm italic text-ink-soft">
            A memoir is not a perfect record. It is a generous one.
          </p>
          <p className="eyebrow-muted">
            Archive · {memories.length}
          </p>
        </div>
      )}

    </div>
  );
}
