"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Positions the two right-hand lanes against the paragraphs they belong to.
 *
 * Every lane item wants the top of its anchor. Where two want the same band the
 * later one is pushed down rather than overlapped, so a margin reads as a
 * column rather than a pile.
 *
 * The two lanes are laid out **separately**, which is the whole reason there
 * are two: a comment thread growing can push other comments down, and must
 * never push a photograph away from the paragraph that earned it. Below 1240px
 * they fold into one lane and share a single de-collision pass — the same
 * breakpoint the stylesheet uses, read here so the two cannot disagree.
 *
 * Below 1000px this does nothing at all: the stylesheet has already dropped
 * every lane item into the flow at its anchor, which is why anchoring beats a
 * feed. The phone layout falls out of the desktop one instead of being a second
 * design.
 *
 * Written against the DOM rather than through React state because every number
 * here is derived from measured layout. Threading forty measured pixel offsets
 * back through a render would re-measure them, and setting state from inside
 * the effect that measured it is a cascading render by construction.
 */

/** Breathing room below a margin object before the next one may start. */
const MARGIN_GAP = 22;

/** Comment cards sit closer: they are a conversation, not separate exhibits. */
const COMMENT_GAP = 14;

const FOLDED = "(max-width: 1240px)";
const INLINE = "(max-width: 1000px)";

export function useLanes(key: string) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const place = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    const items = Array.from(
      root.querySelectorAll<HTMLElement>("[data-anchor]"),
    );

    if (window.matchMedia(INLINE).matches) {
      items.forEach((item) => {
        item.style.top = "";
      });
      root.style.minHeight = "";
      return;
    }

    const folded = window.matchMedia(FOLDED).matches;

    const anchorTop = (item: HTMLElement): number => {
      const anchor = root.querySelector<HTMLElement>(
        `[data-block="${item.dataset.anchor}"]`,
      );
      return anchor ? anchor.offsetTop : Number.MAX_SAFE_INTEGER;
    };

    const lanes = folded
      ? [items]
      : [
          items.filter((item) => item.dataset.lane === "margin"),
          items.filter((item) => item.dataset.lane === "comment"),
        ];

    let lowest = 0;

    for (const lane of lanes) {
      let next = 0;

      // Sorted by where the anchor actually falls, not by render order — a
      // thread added to the second paragraph after one on the fifth must still
      // come out above it.
      const ordered = [...lane].sort((a, b) => anchorTop(a) - anchorTop(b));

      for (const item of ordered) {
        const wanted = anchorTop(item);
        if (wanted === Number.MAX_SAFE_INTEGER) continue;

        const top = Math.max(wanted, next);
        item.style.top = `${top}px`;

        const gap =
          !folded && item.dataset.lane === "comment" ? COMMENT_GAP : MARGIN_GAP;
        next = top + item.offsetHeight + gap;
        lowest = Math.max(lowest, next);
      }
    }

    // How far down the lowest lane item reaches, applied as the column's own
    // minimum height: absolutely positioned children do not stretch their
    // parent, so a long conversation would otherwise hang off the end of the
    // page and be clipped by the footer.
    //
    // Written to the DOM rather than to state. It cannot loop with the
    // observer that measured it, because writing the same value back changes
    // no box and fires nothing.
    root.style.minHeight = lowest > 0 ? `${lowest}px` : "";
  }, []);

  useEffect(() => {
    place();

    const root = rootRef.current;
    if (!root) return;

    // Observe the items too, not only the column. A photograph finishing
    // loading and a thread being expanded both change an item's height without
    // changing the column's, so watching the column alone would leave the rest
    // of the lane overlapping whatever just grew.
    const observer = new ResizeObserver(() => place());
    observer.observe(root);
    root
      .querySelectorAll<HTMLElement>("[data-anchor]")
      .forEach((item) => observer.observe(item));

    window.addEventListener("resize", place);

    // Spectral arrives after first paint and every line reflows when it does.
    if (document.fonts) void document.fonts.ready.then(place);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
    };
    // `key` changes when the chapter, the conversation or what is expanded
    // does — the three things that alter what needs placing.
  }, [place, key]);

  return rootRef;
}
