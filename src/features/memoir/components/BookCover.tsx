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
 * The front and back matter: title page, contents, the people, the colophon.
 *
 * These are what make the reader feel like a book rather than a screen, and
 * they cost almost nothing — every number below is already in the response
 * that draws the contents rail.
 *
 * A server component. Nothing here reacts to anything, so nothing here needs
 * to ship to the browser.
 */
export function BookCover({
  token,
  reading,
}: {
  token: string;
  reading: MemoirReading;
}) {
  const dates = lifespan(reading);
  const { totals } = reading;

  return (
    <main className={styles.page}>
      {/* ---------------------------------------------------- title page */}
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

      {/* ------------------------------------------------------- contents */}
      {reading.chapters.length > 0 && (
        <section className="mt-16">
          <p className="eyebrow-muted">Contents</p>
          <ul className="mt-4 border-t border-border">
            {reading.chapters.map((chapter) => (
              <li key={chapter.id}>
                <Link
                  href={`/m/${token}/${chapter.id}`}
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
      )}

      {reading.chapters.length === 0 && (
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

      {/* ---------------------------------------------------- the people */}
      {reading.people.length > 0 && (
        <section id="people" className="mt-20 scroll-mt-32">
          <p className="eyebrow-muted">The people</p>
          <h3 className="mt-3 font-heading text-2xl leading-tight font-normal tracking-tight">
            Everyone who remembered {reading.subject_name.split(" ")[0]}
          </h3>

          <ul className="mt-6 border-t border-border">
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
        </section>
      )}

      {/* ------------------------------------------------------- colophon */}
      <section className="mt-20">
        <p className="eyebrow-muted">Colophon</p>

        <div className="mt-5 flex border border-border">
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
          none of whom were asked to make an account. Every paragraph carries
          the sources it was drawn from. Where two people remembered the same
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
      </section>
    </main>
  );
}
