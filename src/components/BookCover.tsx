import { cn } from "@/lib/utils";

/**
 * The product's emblem: a printed title page, drawn as a card.
 *
 * `docs/DESIGN-SYSTEM.md` §7 specifies it, onboarding draws it once at signup,
 * and then it was never shown again — so somebody signed up to make a book and
 * landed on a screen with no book on it. It is here so the archive and the
 * contributor page can both open with it.
 *
 * There are two other BookCovers in the tree and neither could be reused: the
 * onboarding one is welded to `onboarding.module.css`, and the reader's is a
 * whole title page with contents and a colophon attached. This one is the card
 * alone, and it knows nothing — three strings and a width.
 *
 * It sits in `src/components/` rather than `ui/` (it is not a shadcn primitive)
 * or `layout/` (it is not `(app)` chrome, and `/j/[token]` renders it).
 *
 * `shadow-lift` rather than the bespoke cover shadow the old prototype used.
 * That was a fourth hard-coded colour in a component, and `--lift` is the one
 * shadow in the product for the reason `globals.css` gives: a shadow invented
 * per component is how eight cards end up with six elevations.
 */
export function BookCover({
  name,
  years,
  dedication,
  className,
  compact = false,
}: {
  name: string;
  /** e.g. "1936 — Forever". Omitted when no year is known. */
  years?: string | null;
  /** "In loving memory of", or "The life of" when the subject is living. */
  dedication: string;
  className?: string;
  /** The 190px cut, for the contributor page. Default is the 250px cut. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 border border-border bg-paper-deep text-center shadow-lift",
        compact
          ? "w-[190px] px-[18px] pt-[26px] pb-[22px]"
          : "w-[250px] px-6 pt-[34px] pb-7",
        className,
      )}
    >
      {/* The printed title-page frame: a second rule 9px inside the first. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[9px] border border-border"
      />

      <span aria-hidden className="mx-auto block size-1.5 rotate-45 bg-seal" />

      <p
        className={cn(
          "font-sans font-normal tracking-[0.2em] text-ink-faint uppercase",
          compact
            ? "mt-5 text-[9px] leading-[1.9]"
            : "mt-[26px] text-[9.5px] leading-[1.9]",
        )}
      >
        {dedication}
      </p>

      <p
        className={cn(
          "mt-2 font-heading leading-tight font-normal tracking-[-0.005em]",
          compact ? "text-[22px]" : "text-[27px]",
        )}
      >
        {name || "—"}
      </p>

      {years && (
        <p
          className={cn(
            "mt-2 font-heading font-light italic text-muted-foreground",
            compact ? "text-[13px]" : "text-[15px]",
          )}
        >
          {years}
        </p>
      )}

      {/*
        The dedication line is the 250px cut only. At 190px the cover is a
        thumbnail beside a headline, and three more lines of 9px uppercase turn
        it into a paragraph.
      */}
      {!compact && (
        <>
          <span aria-hidden className="my-[26px] block h-px bg-rule" />
          <p className="font-sans text-[9.5px] leading-[1.9] font-normal tracking-[0.2em] text-ink-faint uppercase">
            As remembered by everyone who knew them
          </p>
        </>
      )}
    </div>
  );
}
