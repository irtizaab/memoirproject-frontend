"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Link2, Menu, MessageSquare, Search } from "lucide-react";

import { ContentsRail } from "@/features/memoir/components/ContentsRail";
import styles from "@/features/memoir/reader.module.css";
import type { MemoirReading } from "@/features/memoir/schemas";
import { chapterSpan, lifespan } from "@/features/memoir/utils";
import { useTransientLabel } from "@/hooks/useTransientLabel";
import { cn } from "@/lib/utils";

/**
 * The chrome around every page of the book: masthead, contents, the frame.
 *
 * Outside the `(app)` route group and with its own header, for the same reason
 * `/j/[token]` has its own: the person reading arrived by a link and has no
 * account. Signed-in navigation would be four dead ends.
 *
 * Children are the whole book — title page, every chapter, the people, the
 * colophon — stacked down one scrolling page, each rendering its own `.page`
 * column carrying `data-page`. The column is the offset parent the margin and
 * comment lanes are measured against, so it has to belong to whatever is doing
 * the measuring. Which part is under the reader is measured here and handed
 * to the rail and the lifespan mark.
 *
 * ---------------------------------------------------------------------------
 * What the masthead says, and what it deliberately does not
 * ---------------------------------------------------------------------------
 * It names the memoir, whether it is sealed, and the span of the life with the
 * chapter you are in marked on it. It does not announce an edition or a volume
 * number: this is one family's book, there is no second volume, and dressing it
 * as a series is the kind of grandeur that makes a real memoir feel staged.
 */
export function ReaderFrame({
  base,
  reading,
  draft = false,
  children,
}: {
  /** The book's address without a page: `/m/{token}` or `/preview/{id}`. */
  base: string;
  reading: MemoirReading;
  /**
   * The owner reading their own memoir before it is sealed. Says so, once,
   * where they cannot miss it: the alternative is somebody sharing a link to
   * this URL believing it is the family's, which it is not — it is behind
   * their account.
   */
  draft?: boolean;
  children: React.ReactNode;
}) {
  /**
   * Collapsed hides the contents; it does not widen the prose. The frame is a
   * fixed width and the column is offset by a constant, so a reader who hides
   * the rail mid-sentence keeps their line. That invariant is the layout.
   */
  const [collapsed, setCollapsed] = useState(false);
  /** Below 1000px the same rail is a sheet over the page instead. */
  const [open, setOpen] = useState(false);
  const [copyLabel, showCopyLabel] = useTransientLabel("Copy link");
  const currentPage = useCurrentPage(reading);

  const dates = lifespan(reading);
  const current =
    reading.chapters.find((chapter) => chapter.id === currentPage) ?? null;
  const span = current ? chapterSpan(current, reading) : null;

  const copyLink = () => {
    const done = () => showCopyLabel("Copied", 1600);
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(done, done);
    } else {
      done();
    }
  };

  return (
    <div className="min-h-svh">
      {/* The wordmark, on the ground rather than on a card — the one band that
          belongs to the product rather than to this family's book. */}
      <div className="border-b border-border/70">
        <div className={cn(styles.masthead, "px-5 lg:px-0")}>
          <div className="flex items-center justify-between gap-6 py-4">
            <span className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <BookOpen aria-hidden className="size-4" />
              </span>
              <span className="font-heading text-lg leading-none font-normal">
                The Memoir Project
              </span>
            </span>

            <span className="hidden font-sans text-xs text-ink-faint sm:block">
              {draft
                ? "Your copy · not yet sealed"
                : reading.published_at
                  ? "Sealed"
                  : "Not yet published"}
            </span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-paper/90 py-3.5 backdrop-blur-sm">
        <div className={cn(styles.masthead, "px-5 lg:px-0")}>
          <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-lift">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="eyebrow-muted">
                  A shared family memoir
                  {dates && <span className="mx-2 opacity-50">·</span>}
                  {dates}
                </p>
                <h1 className="mt-1.5 truncate font-heading text-xl leading-tight font-normal tracking-tight">
                  {reading.subject_name}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    window.matchMedia("(max-width: 1040px)").matches
                      ? setOpen((was) => !was)
                      : setCollapsed((was) => !was)
                  }
                  aria-expanded={!collapsed || open}
                  className={pill}
                >
                  <Menu aria-hidden className="size-3.5" />
                  Contents
                </button>

                {/* The reader's search is addressed by the link token. The
                    owner already has their own, in the signed-in app, so the
                    preview does without rather than growing a third one. */}
                {!draft && (
                  <Link href={`${base}/search`} className={pill}>
                    <Search aria-hidden className="size-3.5" />
                    Search
                  </Link>
                )}

                <button type="button" onClick={copyLink} className={pill}>
                  <Link2 aria-hidden className="size-3.5" />
                  {copyLabel}
                </button>

                {/* A count, not a badge: how many people have written in the
                    margins, which is a fact about the book rather than a
                    number anybody is being asked to raise. */}
                <span className={cn(pill, "cursor-default text-ink-faint")}>
                  <MessageSquare aria-hidden className="size-3.5" />
                  {reading.totals.memories} memories
                </span>
              </div>
            </div>

            {/*
              The whole life as one hairline, with the chapter you are in marked
              on it. One pixel of "where am I" — not a progress bar, which would
              need a denominator this product refuses to imply.
            */}
            {reading.born_year && (
              <div className="mt-4 flex items-center gap-4 border-t border-border/70 pt-3.5">
                <span className="eyebrow-muted">{reading.born_year}</span>
                <div className="relative h-2 flex-1">
                  <span className="absolute inset-x-0 top-0.5 h-1 rounded-full bg-muted" />
                  {span && (
                    <span
                      className="absolute top-0.5 h-1 rounded-full bg-seal transition-all duration-300"
                      style={{
                        left: `${span.left}%`,
                        width: `${Math.max(span.width, 0.6)}%`,
                      }}
                    />
                  )}
                </div>
                <span className="eyebrow-muted">
                  {reading.through_year ?? "Present"}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* The scrim only exists below 1000px, where the rail is a sheet. */}
      <button
        type="button"
        aria-hidden={!open}
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-50 bg-ink/25 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <div className={styles.frame}>
        <ContentsRail
          reading={reading}
          currentPage={currentPage}
          collapsed={collapsed}
          open={open}
          onExpand={() => setCollapsed(false)}
          onNavigate={() => setOpen(false)}
        />
        <main>{children}</main>
      </div>

      <footer className="border-t border-border/70">
        <div
          className={cn(
            styles.masthead,
            "flex flex-wrap items-center justify-between gap-3 px-5 py-7 lg:px-0",
          )}
        >
          <p className="font-heading text-sm italic text-ink-soft">
            Preserving generational memories with quiet dignity.
          </p>
          <p className="font-sans text-xs text-ink-faint">
            {reading.totals.people} people · {reading.totals.chapters} chapters
          </p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Which part of the book is under the reader: the last `[data-page]` whose
 * top has passed a line a third of the way down the viewport, or the final
 * one once the page is scrolled to its end (the colophon is shorter than the
 * distance to that line). Scroll-driven rather than an IntersectionObserver
 * band, so a short part can still be current.
 */
function useCurrentPage(reading: MemoirReading): string {
  const [current, setCurrent] = useState("title");
  const raf = useRef(0);

  useEffect(() => {
    const measure = () => {
      raf.current = 0;
      const parts = Array.from(
        document.querySelectorAll<HTMLElement>("[data-page]"),
      );
      if (parts.length === 0) return;

      const line = window.innerHeight / 3;
      let found = parts[0].dataset.page ?? "title";
      for (const part of parts) {
        if (part.getBoundingClientRect().top <= line) {
          found = part.dataset.page ?? found;
        }
      }
      const atEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atEnd) found = parts[parts.length - 1].dataset.page ?? found;
      setCurrent(found);
    };

    const onScroll = () => {
      if (!raf.current) raf.current = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf.current) window.cancelAnimationFrame(raf.current);
    };
    // Re-measure when the book's parts change — a renamed or dropped chapter.
  }, [reading.chapters]);

  return current;
}

/**
 * The one control shape in the reader's chrome.
 *
 * A string rather than a component because three of the four are different
 * elements — a button, a link, and a plain span — and wrapping each in a
 * component to share five classes is more machinery than the classes.
 */
const pill =
  "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 font-sans text-xs text-ink-soft transition-colors hover:border-ink-faint hover:text-foreground";
