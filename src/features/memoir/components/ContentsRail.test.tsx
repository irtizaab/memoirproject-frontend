import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ContentsRail } from "@/features/memoir/components/ContentsRail";
import type { MemoirReading } from "@/features/memoir/schemas";

/**
 * The rail is the book's structure, stated. What is tested is that it says the
 * same thing the routes do.
 *
 * The regression it exists for: "Back matter" used to be one entry pointing at
 * `/m/{token}#people` — an anchor halfway down the front matter. The rail
 * named a part of the book that was not a page, and the colophon appeared in
 * no contents at all.
 */
const READING: MemoirReading = {
  memoir_id: "00000000-0000-4000-8000-000000000000",
  subject_name: "Eleanor Marsh",
  born_year: 1928,
  through_year: 2015,
  subject_is_living: false,
  published_at: null,
  chapters: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      ordinal: 0,
      title: "The House on Ellsworth Lane",
      from_year: 1928,
      through_year: 1934,
    },
  ],
  people: [],
  totals: { memories: 91, people: 23, chapters: 1, recordings: 14 },
};

function rail(base = "/m/tok") {
  return render(
    <ContentsRail
      base={base}
      reading={READING}
      currentPage={null}
      collapsed={false}
      open={false}
      onExpand={vi.fn()}
      onNavigate={vi.fn()}
    />,
  );
}

describe("ContentsRail", () => {
  it("names the three parts of a book", () => {
    rail();

    expect(screen.getByText("Front matter")).toBeInTheDocument();
    expect(screen.getByText("Chapters")).toBeInTheDocument();
    expect(screen.getByText("Back matter")).toBeInTheDocument();
  });

  it("points the back matter at pages, not at an anchor", () => {
    rail();

    // The `#people` anchor is the bug: a link into the middle of another page
    // cannot be the whole of "back matter".
    // Named loosely: every rail entry carries a numeral beside its title, so
    // the accessible name is "· The people" rather than the title alone.
    for (const [name, href] of [
      [/the people/i, "/m/tok/people"],
      [/colophon/i, "/m/tok/colophon"],
    ] as const) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("builds every link from the base it was given", () => {
    // The owner's preview is the same rail at a different address. If anything
    // here hard-codes `/m/`, the preview navigates the family's copy instead —
    // and they have no session for it.
    rail("/preview/abc");

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(/^\/preview\/abc/);
    }
  });
});
