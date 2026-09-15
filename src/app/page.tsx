import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Feather, Link2, Mic } from "lucide-react";

import { Wordmark } from "@/components/layout/Wordmark";
import { buttonVariants } from "@/components/ui/button";

/**
 * The front door.
 *
 * `/` used to redirect to `/archive`, which bounced a signed-out visitor to
 * `/onboarding` — so the only way back into an existing account was to start
 * the flow again and be told at the end that you already have a memoir. The
 * two things missing were this page and `/signin`.
 *
 * A server component with no data of its own. It sits outside the `(app)`
 * group for the same reason `/onboarding` does: there is nothing to navigate
 * to yet, and the signed-in header would be four dead ends.
 *
 * ---------------------------------------------------------------------------
 * What the copy may and may not say
 * ---------------------------------------------------------------------------
 * Every claim below is something the product actually does. No invented
 * numbers, no testimonials nobody gave, and no completion language — the
 * archive README forbids progress framing everywhere, and a landing page is
 * the most tempting place to break that rule.
 */
export const metadata: Metadata = {
  title: "The Memoir Project",
  description:
    "One memoir for someone you love, written by everyone who knew them.",
};

export default function Home() {
  return (
    <div className="min-h-svh bg-paper">
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Wordmark />

          <Link
            href="/signin"
            className="font-sans text-sm text-ink-soft transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main>
        {/* ------------------------------------------------------- the hero */}
        <section className="mx-auto max-w-7xl px-5 pt-20 pb-16">
          <p className="eyebrow-muted">A shared family memoir</p>
          <h1 className="mt-5 max-w-[22ch] font-heading text-[clamp(34px,6vw,58px)] leading-[1.08] font-normal tracking-tight text-balance">
            One book about one person, written by everyone who knew them.
          </h1>
          <p className="mt-6 max-w-[52ch] font-sans text-base leading-relaxed text-muted-foreground">
            You send one link. Their sister records a voice note on the bus,
            their nephew types four lines at midnight, somebody photographs a
            ledger in a blue tin. It comes back as a book with chapters — and
            every paragraph still says who it came from.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/onboarding" className={buttonVariants()}>
              <Feather aria-hidden className="size-4" />
              Start a memoir
            </Link>
            <Link
              href="/signin"
              className={buttonVariants({ variant: "outline" })}
            >
              I already have one
            </Link>
          </div>
        </section>

        {/* ------------------------------------------------ how it actually goes */}
        <section className="border-t border-border/70 bg-paper-deep">
          <div className="mx-auto max-w-7xl px-5 py-16">
            <p className="eyebrow-muted">How it goes</p>
            <ol className="mt-8 grid gap-8 sm:grid-cols-3">
              {[
                {
                  icon: Link2,
                  title: "Send one link",
                  body: "Nobody signs up, nobody downloads anything. A link in a group chat is the whole invitation, and a contributor who comes back is recognised as the same person.",
                },
                {
                  icon: Mic,
                  title: "They answer in their own words",
                  body: "Voice, writing, photographs — in any combination, from a phone. Recordings are transcribed for you, and the words stay theirs.",
                },
                {
                  icon: BookOpen,
                  title: "It becomes a book",
                  body: "Chapters, a contents page, photographs beside the passages they belong to, and a private link with a passphrase. A PDF too, if you want it on a shelf.",
                },
              ].map((step, index) => (
                <li key={step.title}>
                  <span className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-seal">
                    <step.icon aria-hidden className="size-4" />
                  </span>
                  <h2 className="mt-4 font-heading text-lg leading-snug font-normal">
                    <span className="mr-2 font-sans text-[10px] font-medium tracking-[0.16em] text-ink-faint">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {step.title}
                  </h2>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------- what it will not do */}
        <section className="mx-auto max-w-7xl px-5 py-16">
          <p className="eyebrow-muted">What it will not do</p>
          <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {[
              {
                term: "Invent a memory",
                detail:
                  "Nothing is written that somebody did not say. Where two people remember the same afternoon differently, both accounts are kept and neither is corrected.",
              },
              {
                term: "Ask your family for accounts",
                detail:
                  "Contributors never create one. That is the point of the link.",
              },
              {
                term: "Change a sealed memoir",
                detail:
                  "Once you seal it, not a word can move — not by you, not by us. The margins stay open forever, so the conversation can keep going without touching the book.",
              },
              {
                term: "Count anything at you",
                detail:
                  "No streaks, no percentage complete, no reminders about a memoir you left open. Grief does not have a deadline.",
              },
            ].map((promise) => (
              <div key={promise.term} className="border-t border-border pt-4">
                <dt className="font-heading text-base leading-snug font-normal">
                  {promise.term}
                </dt>
                <dd className="mt-1.5 font-sans text-sm leading-relaxed text-muted-foreground">
                  {promise.detail}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t border-border/70">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-5 py-14">
            <p className="max-w-[38ch] font-heading text-xl leading-snug font-light italic text-ink-soft">
              The house goes quiet either way. This is the part you can still do
              something about.
            </p>
            <Link href="/onboarding" className={buttonVariants()}>
              <Feather aria-hidden className="size-4" />
              Start a memoir
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-8">
          <p className="font-heading text-sm italic text-ink-soft">
            Preserving generational memories with quiet dignity.
          </p>
          <p className="font-sans text-xs text-ink-faint">
            © The Memoir Project
          </p>
        </div>
      </footer>
    </div>
  );
}
