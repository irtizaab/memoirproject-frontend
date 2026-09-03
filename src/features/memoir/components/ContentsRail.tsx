"use client";

import Link from "next/link";

import styles from "@/features/memoir/reader.module.css";
import type { MemoirReading } from "@/features/memoir/schemas";
import { chapterYears, roman } from "@/features/memoir/utils";
import { cn } from "@/lib/utils";

/**
 * The contents — chapter title and the years it covers, and nothing else.
 *
 * Not a timeline. An earlier design had years down the left rail with a word
 * beside each ("1928 Birth", "1942 Conservatory"), which read as navigation but
 * was a second structure running alongside the chapters at a different speed:
 * the reader had to hold a mapping between the two. The chapter is the unit a
 * reader moves in, and the year is metadata on it.
 *
 * The whole rail rests at `ink-faint` and lifts on hover of the **rail**, not
 * of a line. At rest it should register as texture, the way running heads and
 * folios do in a printed book — present, and not read. That is what makes four
 * columns legible where four columns of equal weight would not be.
 */
export function ContentsRail({
  token,
  reading,
  currentChapterId,
  collapsed,
  open,
  onExpand,
  onNavigate,
}: {
  token: string;
  reading: MemoirReading;
  currentChapterId: string | null;
  collapsed: boolean;
  open: boolean;
  onExpand: () => void;
  onNavigate: () => void;
}) {
  const groups = [
    {
      label: "Front matter",
      items: [{ id: null, href: `/m/${token}`, title: "Title page" }],
    },
    {
      label: "Chapters",
      items: reading.chapters.map((chapter) => ({
        id: chapter.id,
        href: `/m/${token}/${chapter.id}`,
        title: chapter.title,
        numeral: roman(chapter.ordinal + 1),
        years: chapterYears(chapter),
      })),
    },
  ];

  return (
    <nav
      aria-label="Contents"
      className={cn(
        styles.rail,
        collapsed && styles.railCollapsed,
        open && styles.railOpen,
      )}
    >
      <button
        type="button"
        onClick={onExpand}
        className={cn(
          styles.railStrip,
          "font-sans text-[10px] font-medium tracking-[0.22em] text-ink-faint uppercase transition-colors hover:text-seal",
        )}
      >
        Contents
      </button>

      <div className={cn(styles.railBody, "group")}>
        {groups.map((group) => (
          <div key={group.label} className="mb-6">
            <span className="mb-1.5 block border-b border-border pb-2 font-sans text-[9.5px] font-medium tracking-[0.18em] text-ink-faint uppercase opacity-70">
              {group.label}
            </span>

            {group.items.map((item) => {
              const isCurrent = item.id === currentChapterId;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "relative block py-2 pl-5 transition-colors",
                    isCurrent
                      ? "text-foreground"
                      : "text-ink-faint group-hover:text-ink-soft hover:!text-foreground",
                  )}
                >
                  {/* The diamond is the product's only ornament, and marking
                      where you are is the one thing worth spending it on. */}
                  {isCurrent && (
                    <span
                      aria-hidden
                      className="absolute top-3.5 -left-3 size-[5px] rotate-45 bg-seal"
                    />
                  )}
                  <span className="absolute top-2.5 left-0 font-sans text-[9.5px] font-medium tracking-[0.1em]">
                    {"numeral" in item ? item.numeral : "·"}
                  </span>
                  <span className="block font-heading text-[15px] leading-snug font-light">
                    {item.title}
                  </span>
                  {"years" in item && item.years && (
                    <span className="mt-0.5 block font-sans text-[9.5px] font-medium tracking-[0.16em] opacity-85">
                      {item.years}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        <div>
          <span className="mb-1.5 block border-b border-border pb-2 font-sans text-[9.5px] font-medium tracking-[0.18em] text-ink-faint uppercase opacity-70">
            Back matter
          </span>
          <Link
            href={`/m/${token}#people`}
            onClick={onNavigate}
            className="relative block py-2 pl-5 text-ink-faint transition-colors group-hover:text-ink-soft hover:!text-foreground"
          >
            <span className="absolute top-2.5 left-0 font-sans text-[9.5px] font-medium">
              ·
            </span>
            <span className="block font-heading text-[15px] leading-snug font-light">
              The people
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
