"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { ContentsRail } from "@/features/memoir/components/ContentsRail";
import styles from "@/features/memoir/reader.module.css";
import type { MemoirReading } from "@/features/memoir/schemas";
import { chapterSpan, lifespan } from "@/features/memoir/utils";
import { cn } from "@/lib/utils";

/**
 * The chrome around every page of the book: masthead, contents, the frame.
 *
 * Outside the `(app)` route group and with its own header, for the same reason
 * `/j/[token]` has its own: the person reading arrived by a link and has no
 * account. Signed-in navigation would be four dead ends.
 *
 * Children render their own `.page` column. That is deliberate — the column is
 * the offset parent the margin and comment lanes are measured against, so it
 * has to belong to whatever is doing the measuring.
 */
export function ReaderFrame({
  token,
  reading,
  currentChapterId,
  children,
}: {
  token: string;
  reading: MemoirReading;
  /** Null on the front and back matter, which are not chapters. */
  currentChapterId: string | null;
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

  const dates = lifespan(reading);
  const current =
    reading.chapters.find((chapter) => chapter.id === currentChapterId) ?? null;
  const span = current ? chapterSpan(current, reading) : null;

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-40 border-b border-border bg-paper/95 backdrop-blur-sm">
        <div className={cn(styles.masthead, "px-5 pt-4 lg:px-0")}>
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="eyebrow-muted">Digital memoir · Archive edition</p>
              <h1 className="mt-1.5 font-heading text-2xl leading-tight font-normal tracking-tight">
                {reading.subject_name}
              </h1>
            </div>

            <div className="text-right font-sans text-xs leading-relaxed text-muted-foreground">
              {dates && (
                <span className="block font-heading text-sm font-light text-foreground">
                  {dates}
                </span>
              )}
              {/*
                A memoir that is not sealed says so. Hiding the difference would
                let a family read a draft believing it was finished.
              */}
              {reading.published_at ? "Sealed" : "Not yet published"}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-4 border-t border-border py-3">
            <button
              type="button"
              onClick={() =>
                window.matchMedia("(max-width: 1000px)").matches
                  ? setOpen((was) => !was)
                  : setCollapsed((was) => !was)
              }
              aria-expanded={!collapsed || open}
              className="flex items-center gap-2 pb-0.5 font-sans text-[10px] font-medium tracking-[0.16em] text-ink-faint uppercase transition-colors hover:text-ink-soft"
            >
              <Menu aria-hidden className="size-3.5 lg:hidden" />
              Contents
            </button>

            {/*
              The whole life as one hairline, with the chapter you are in marked
              on it. One pixel of "where am I" — not a progress bar, which would
              need a denominator this product refuses to imply.
            */}
            {reading.born_year && (
              <>
                <span className="eyebrow-muted">{reading.born_year}</span>
                <div className="relative h-2 flex-1">
                  <span className="absolute inset-x-0 top-1 h-px bg-rule" />
                  {span && (
                    <span
                      className="absolute top-0.5 h-1.5 bg-seal transition-all duration-300"
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
              </>
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
          token={token}
          reading={reading}
          currentChapterId={currentChapterId}
          collapsed={collapsed}
          open={open}
          onExpand={() => setCollapsed(false)}
          onNavigate={() => setOpen(false)}
        />
        {children}
      </div>
    </div>
  );
}
