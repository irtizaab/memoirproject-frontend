import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The mark and the name, top left of every screen.
 *
 * The glyph is inline SVG rather than an image file so it inherits the ink
 * colour, needs no network request, and cannot be the thing that flashes
 * blank on a slow connection.
 *
 * `href` is a prop because the contributor screens use the same wordmark but
 * must not link into the signed-in app — a contributor has no account, and a
 * link to `/archive` would send them to a redirect.
 */
export function Wordmark({
  href,
  className,
}: {
  /** Where the mark links. Omit to render it as plain, unclickable text. */
  href?: string;
  className?: string;
}) {
  const content = (
    <>
      <span
        aria-hidden
        className="flex size-6 shrink-0 items-center justify-center rounded-[3px] bg-ink"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
          {/* A bookmark ribbon: the thing you leave in a book to come back to. */}
          <path
            d="M4 2h8v12l-4-3-4 3V2z"
            fill="var(--paper)"
            stroke="var(--paper)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="font-heading text-lg leading-none font-normal tracking-tight">
        The Memoir Project
      </span>
    </>
  );

  const classes = cn("flex items-center gap-2.5 text-foreground", className);

  if (!href) return <span className={classes}>{content}</span>;

  return (
    <Link href={href} className={cn(classes, "hover:opacity-80")}>
      {content}
    </Link>
  );
}
