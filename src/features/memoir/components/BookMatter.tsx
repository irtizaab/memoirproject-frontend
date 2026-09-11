import Link from "next/link";

import styles from "@/features/memoir/reader.module.css";
import type { MemoirReading } from "@/features/memoir/schemas";
import {
  chapterYears,
  lifespan,
  relationshipLabel,
  roman,
  spell,
} from "@/features/memoir/utils";

/**
 * The front and back matter — three pages, not one.
 *
 * These are what make the reader a book rather than a screen, and they cost
 * almost nothing: every number below is already in the response that draws the
 * contents rail.
 *
 * ---------------------------------------------------------------------------
 * Why they are separate pages
 * ---------------------------------------------------------------------------
 * They used to be one screen — title page, contents, the people and the
 * colophon stacked down `/m/{token}`, with the contents rail pointing at
 * `#people`. That made the rail dishonest: "Back matter" named an anchor
 * halfway down the front matter, and a book whose every chapter is a page had
 * a first page four pages long.
 *
 * A memoir is read in one direction. So each of these is a page with its own
 * address, its own entry in the contents, and its own place in the sequence
 * the turn buttons walk: title page, the chapters in order, the people, the
 * colophon. A granddaughter can send somebody the list of everyone who
 * remembered her grandmother without sending them the title page.
 *
 * Server components. Nothing here reacts to anything, so nothing here needs to
 * ship to the browser.
 *
 * `base` is the book's address without a page — `/m/{token}` for the family,
 * `/preview/{memoirId}` for the owner reading before they seal it. Every link
 * in the reader is built from it, which is the whole of what those two paths
 * have to disagree about.
 */
export function TitlePage({
  base,
  reading,
}: {
  base: string;
  reading: MemoirReading;
}) {
  const dates = lifespan(reading);
  const first = reading.chapters[0];

  return (
    <main className={styles.page}>
      <section className="pt-12 text-center">
        <span
          aria-hidden
          className="mx-auto mb-7 block size-1.5 rotate-45 bg-seal"
        />
        <p className="font-sans text-[9.5px] leading-loose tracking-[0.2em] text-ink-faint uppercase">
          {reading.subject_is_living ? "The life of" : "In loving memory of"}
        </p>
        <h2 className="mt-5 font-heading text-[clamp(32px,6vw,46px)] leading-tight font-normal tracking-tight text-balance">
          {reading.subject_name}
        </h2>
        {dates && (
          <p className="mt-2.5 font-heading text-base font-light italic text-muted-foreground">
            {dates}
          </p>
        )}
        <span aria-hidden className="mx-auto my-8 block h-px w-16 bg-rule" />
        <p className="font-sans text-[9.5px] leading-loose tracking-[0.2em] text-ink-faint uppercase">
          As remembered by everyone who knew them
        </p>
      </section>

      {reading.chapters.length > 0 ? (
        <section className="mt-16">
          <p className="eyebrow-muted">Contents</p>
          <ul className="mt-4 border-t border-border">
            {reading.chapters.map((chapter) => (
              <li key={chapter.id}>
                <Link
                  href={`${base}/${chapter.id}`}
                  className="flex items-baseline gap-4 border-b border-border py-4 transition-colors hover:text-seal"
                >
                  <span className="w-8 shrink-0 font-sans text-[9.5px] font-medium tracking-[0.1em] text-ink-faint">
                    {roman(chapter.ordinal + 1)}
                  </span>
                  <span className="flex-1 font-heading text-lg leading-snug font-light">
                    {chapter.title}
                  </span>
                  <span className="shrink-0 font-sans text-[9.5px] font-medium tracking-[0.16em] text-ink-faint uppercase">
                    {chapterYears(chapter)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        /*
          No chapters yet. One quiet line — no progress bar, no "0% complete",
          nothing that turns waiting into a score. Waiting is the normal state
          of this product.
        */
        <section className="mt-16 border-t border-border pt-6">
          <p className="font-heading text-lg leading-relaxed font-light text-muted-foreground">
            The chapters have not been drafted yet. When they are, they will
            appear here.
          </p>
        </section>
      )}

      <TurnNav
        onward={
          first
            ? {
                href: `${base}/${first.id}`,
                eyebrow: `Chapter ${roman(first.ordinal + 1)}`,
                title: first.title,
              }
            : { href: `${base}/people`, eyebrow: "Onward", title: "The people" }
        }
      />
    </main>
  );
}

/** Back matter: everyone the memoir was assembled from. */
export function PeoplePage({
  base,
  reading,
}: {
  base: string;
  reading: MemoirReading;
}) {
  const last = reading.chapters[reading.chapters.length - 1];

  return (
    <main className={styles.page}>
      <header className="mb-11 text-center">
        <p className="eyebrow flex justify-center gap-4">
          <span>The people</span>
        </p>
        <h2 className="mx-auto mt-3.5 max-w-[16em] font-heading text-[clamp(26px,4vw,36px)] leading-tight font-normal tracking-tight text-balance">
          Everyone who remembered {reading.subject_name.split(" ")[0]}
        </h2>
        <span aria-hidden className="mx-auto mt-7 block h-px w-52 bg-rule" />
      </header>

      {reading.people.length > 0 ? (
        <ul className="border-t border-border">
          {reading.people.map((person) => (
            <li
              key={person.participant_id}
              className="flex items-baseline gap-4 border-b border-border py-3.5"
            >
              <span className="flex-1 font-heading text-[17px] font-light">
                {person.name}
              </span>
              <span className="w-32 font-sans text-[10px] font-medium tracking-[0.15em] text-ink-faint uppercase">
                {relationshipLabel(person.relationship)}
              </span>
              <span className="min-w-24 text-right font-sans text-xs text-muted-foreground">
                {person.memory_count}{" "}
                {person.memory_count === 1 ? "memory" : "memories"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-heading text-lg leading-relaxed font-light text-muted-foreground">
          Nobody has sent a memory yet.
        </p>
      )}

      <TurnNav
        back={
          last
            ? { href: `${base}/${last.id}`, eyebrow: "Back", title: last.title }
            : { href: base, eyebrow: "Back", title: "Title page" }
        }
        onward={{
          href: `${base}/colophon`,
          eyebrow: "Onward",
          title: "Colophon",
        }}
      />
    </main>
  );
}

/** Back matter: how the book was made, and whether it is sealed. */
export function ColophonPage({
  base,
  reading,
}: {
  base: string;
  reading: MemoirReading;
}) {
  const { totals } = reading;

  return (
    <main className={styles.page}>
      <header className="mb-11 text-center">
        <p className="eyebrow flex justify-center gap-4">
          <span>Colophon</span>
        </p>
        <h2 className="mx-auto mt-3.5 max-w-[16em] font-heading text-[clamp(26px,4vw,36px)] leading-tight font-normal tracking-tight text-balance">
          How this book was made
        </h2>
        <span aria-hidden className="mx-auto mt-7 block h-px w-52 bg-rule" />
      </header>

      <div className="flex border border-border">
        {[
          { value: totals.memories, label: "Memories" },
          { value: totals.people, label: "People" },
          { value: totals.chapters, label: "Chapters" },
          { value: totals.recordings, label: "Recordings" },
        ].map((cell) => (
          <div
            key={cell.label}
            className="flex-1 border-r border-border px-1.5 py-5 text-center last:border-r-0"
          >
            <b className="block font-heading text-[27px] font-normal">
              {cell.value}
            </b>
            <span className="mt-1.5 block font-sans text-[9.5px] font-medium tracking-[0.16em] text-ink-faint uppercase">
              {cell.label}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-8 font-sans text-[12.5px] leading-loose text-muted-foreground">
        Assembled from voice notes, photographs and written recollections left
        by {spell(totals.people)} {totals.people === 1 ? "person" : "people"},
        none of whom were asked to make an account. Every paragraph carries the
        sources it was drawn from. Where two people remembered the same
        afternoon differently, both accounts were kept and neither was
        corrected.
      </p>

      <div className="mt-8 border border-seal p-6">
        <b className="mb-2 block font-heading text-[17px] font-normal">
          {reading.published_at
            ? `Sealed ${new Date(reading.published_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}.`
            : "Not yet published."}
        </b>
        <span className="font-sans text-[13px] leading-relaxed text-muted-foreground">
          {reading.published_at
            ? "Nothing in this memoir can be changed. The comment layer stays open — anyone with the link may add to the margins, and nothing they add will alter a word of what is already here."
            : "This memoir is still a draft. Its keeper can still change it, and it is not sealed until they publish it themselves."}
        </span>
      </div>

      <TurnNav
        back={{ href: `${base}/people`, eyebrow: "Back", title: "The people" }}
      />
    </main>
  );
}

/** One end of the turn: where it goes, what to call it, and the label above. */
export type Turn = { href: string; eyebrow: string; title: string };

/**
 * The turn buttons at the foot of every page of the book.
 *
 * Exported because a chapter turns the same way the matter does — the book is
 * read in one direction and the sequence runs title page, chapters, the
 * people, the colophon. `ChapterReader` had its own copy of this markup until
 * the matter pages needed the same thing; two copies of "how a page turns" is
 * how one of them quietly stops matching the other.
 */
export function TurnNav({ back, onward }: { back?: Turn; onward?: Turn }) {
  if (!back && !onward) return null;

  return (
    <nav className="mt-16 flex justify-between gap-6 border-t border-border pt-5">
      {back && (
        <Link
          href={back.href}
          className="max-w-[46%] text-ink-faint transition-colors hover:text-foreground"
        >
          <span className="eyebrow-muted mb-1.5 block">{back.eyebrow}</span>
          <span className="font-heading text-base leading-snug font-light">
            {back.title}
          </span>
        </Link>
      )}

      {onward && (
        <Link
          href={onward.href}
          className="ml-auto max-w-[46%] text-right text-ink-faint transition-colors hover:text-foreground"
        >
          <span className="eyebrow-muted mb-1.5 block">{onward.eyebrow}</span>
          <span className="font-heading text-base leading-snug font-light">
            {onward.title}
          </span>
        </Link>
      )}
    </nav>
  );
}
