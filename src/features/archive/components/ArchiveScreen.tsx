"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { BookCover } from "@/components/BookCover";
import { PageBody } from "@/components/layout/PageBody";
import { buttonVariants } from "@/components/ui/button";
import { useActiveMemoir } from "@/features/account";
import { BookPanel } from "@/features/archive/components/BookPanel";
import { InviteBanner } from "@/features/archive/components/InviteBanner";
import { LeadMemory } from "@/features/archive/components/LeadMemory";
import { MemoryCard } from "@/features/archive/components/MemoryCard";
import { useMemories } from "@/features/archive/hooks";
import { archiveStats, archiveTitle } from "@/features/archive/utils";
import { PeopleList, useContributors } from "@/features/contributors";

/**
 * The photograph behind the opening band, felt more than seen.
 *
 * One of the six in `public/Images/`, at the low end of the 0.10–0.26 range the
 * design brief gives — a book cover and a headline both sit on top of it, and
 * this is the only screen where both do.
 */
const BAND_PHOTOGRAPH = "/Images/ca328bf4-b1f7-49c4-9927-89b9fb46bab8.jpg";

/**
 * The archive: what is being built, who is helping, and what has arrived.
 *
 * Three bands at three weights rather than five sections at one. That is the
 * whole structure: `--paper-deep` for the book itself, then the ordinary page
 * for the people helping to fill it and for what they have sent — so a section
 * boundary means something instead of being forty pixels of air.
 *
 * The book cover is on the page because it is specified in the design brief,
 * drawn once during onboarding, and was then never shown again: somebody signed
 * up to make a book and landed on a screen with no book on it.
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
  const { data: overview } = useContributors(memoir?.id ?? null);

  // Someone who signed up but never finished onboarding. A real state, and the
  // only useful thing to say is where to go.
  if (!memoirPending && !memoir) {
    return (
      <PageBody className="max-w-2xl">
        <p className="eyebrow">Your living archive</p>
        <h1 className="mt-3 font-heading text-[clamp(26px,4vw,32px)] leading-tight font-normal tracking-tight">
          There is no memoir here yet.
        </h1>
        <p className="mt-2.5 font-sans text-sm leading-relaxed text-muted-foreground">
          You have an account, but no memoir has been created against it.
        </p>
        <Link href="/onboarding" className={`${buttonVariants()} mt-6`}>
          Start a memoir
        </Link>
      </PageBody>
    );
  }

  const stats = memories ? archiveStats(memories) : null;
  const people = overview?.participants ?? [];
  const contributed = people.filter((person) => person.memory_count > 0);
  const [lead, ...rest] = memories ?? [];

  const dedication = memoir?.subject_is_living
    ? "The life of"
    : "In loving memory of";
  const coverYears = memoir?.born_year ? `${memoir.born_year} — Forever` : null;

  return (
    <>
      {/* ===================== BAND ONE: what is being built ================ */}
      <div className="relative overflow-hidden border-b border-border bg-paper-deep">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-[center_60%] opacity-[0.12]"
          style={{ backgroundImage: `url(${BAND_PHOTOGRAPH})` }}
        />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center gap-10 px-6 pt-12 pb-11 md:flex-row md:items-start md:gap-14">
          <BookCover
            name={memoir?.subject_name ?? "—"}
            years={coverYears}
            dedication={dedication}
          />

          <div className="min-w-0 flex-1">
            <p className="eyebrow">The archive</p>
            <h1 className="mt-3 font-heading text-[clamp(28px,4.4vw,36px)] leading-[1.12] font-normal tracking-tight text-balance">
              {archiveTitle(memoir)}
            </h1>

            {/*
              The owner's own answer to "what must never be forgotten about
              them", given at signup. It used to be a 14px italic blockquote
              wedged between the title and a panel; it is the one sentence they
              wrote about the person, so it is now the voice of the page.

              It appears here and nowhere a contributor can see it — the
              backend's `response_model` on `GET /j/{token}` filters it out.
            */}
            {memoir?.never_forget && (
              <>
                <blockquote className="mt-5 max-w-[30ch] font-heading text-[23px] leading-[1.45] font-light italic">
                  &ldquo;{memoir.never_forget}&rdquo;
                </blockquote>
                <p className="eyebrow-muted mt-2.5">
                  What must never be forgotten &middot; yours alone
                </p>
              </>
            )}

            <span aria-hidden className="mt-8 block h-px bg-rule" />

            {/* The state of the book, and the single next action. */}
            <BookPanel memoir={memoir ?? null} />
          </div>
        </div>

        {/*
          Reassurance, not measurement. `docs/DESIGN-SYSTEM.md` §7 — four plain
          facts about what is held here, and nothing that could be read as a
          score against a total nobody has.
        */}
        {stats && memories && memories.length > 0 && (
          <div className="relative mx-auto w-full max-w-7xl px-6 pb-10">
            <dl className="grid grid-cols-2 border border-border bg-paper sm:grid-cols-4">
              {stats.map((cell) => (
                <div
                  key={cell.label}
                  className="border-t border-l border-border px-1.5 py-[22px] text-center first:border-l-0 sm:border-t-0"
                >
                  <dd className="font-heading text-[27px] leading-none font-normal">
                    {cell.n}
                  </dd>
                  <dt className="eyebrow-muted mt-2">{cell.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      {/* ============= BAND TWO: is it working, and who is missing ========== */}
      <div className="border-b border-border">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-11 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <InviteBanner linkToken={memoir?.link_token ?? null} />

          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="eyebrow">
                {contributed.length === 0
                  ? "Nobody has added a memory yet"
                  : contributed.length === 1
                    ? "One person has added memories"
                    : `${contributed.length} people have added memories`}
              </p>
              <Link
                href="/contributors"
                className="border-b border-border pb-0.5 font-sans text-[13px] text-muted-foreground transition-colors hover:text-seal"
              >
                All contributors
              </Link>
            </div>

            {people.length > 0 ? (
              <PeopleList people={people} className="mt-4" />
            ) : (
              <p className="mt-4 font-sans text-sm leading-relaxed text-muted-foreground">
                Nobody has opened the link yet. Nothing is wrong — waiting is
                the normal state of this.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===================== BAND THREE: what has arrived ================= */}
      <PageBody>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-heading text-[26px] font-normal tracking-tight">
            What has arrived
          </h2>
          <div className="flex flex-wrap items-baseline gap-5">
            {memories && memories.length > 0 && (
              <p className="eyebrow-muted">{memories.length} held here</p>
            )}
            {/* Search is here rather than in the header, because it searches
                this memoir and the header belongs to the account. */}
            <Link
              href="/search"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Search aria-hidden />
              Search
            </Link>
            <Link
              href="/archive/new"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus aria-hidden />
              New memory
            </Link>
          </div>
        </div>

        <span aria-hidden className="mt-5 mb-7 block h-px bg-rule" />

        {memoriesPending || memoirPending ? (
          <p className="font-sans text-sm text-ink-faint">
            Gathering what has been collected…
          </p>
        ) : lead ? (
          <>
            {/*
              The newest one at reading size, so the page opens with somebody's
              actual words rather than with a grid of thumbnails. A 3-up grid of
              tiles asks you to scan twelve things and read none.
            */}
            <LeadMemory memory={lead} />

            {rest.length > 0 && (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} />
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
              <p className="font-heading text-[15px] italic text-muted-foreground">
                A memoir is not a perfect record. It is a generous one.
              </p>
              <p className="eyebrow-muted">
                Archive &middot; {memories?.length}
              </p>
            </div>
          </>
        ) : (
          /*
            The state every new owner sees first, and the one worth getting
            right. One quiet line and the two things there are to do — not an
            empty grid, and certainly not a progress bar telling somebody their
            grandmother's memoir is 0% complete.
          */
          <p className="font-sans text-sm leading-relaxed text-muted-foreground">
            Nothing has been added yet. Share the link above, or{" "}
            <Link
              href="/archive/new"
              className="text-seal underline underline-offset-4"
            >
              write the first memory yourself
            </Link>
            .
          </p>
        )}
      </PageBody>
    </>
  );
}
