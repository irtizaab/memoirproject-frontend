import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ContentsRail } from "@/features/memoir/components/ContentsRail";
import type { MemoirReading } from "@/features/memoir/schemas";

/**
 * The rail is the book's structure, stated. The book is one scrolling page,
 * so every entry is an anchor into it, and the one under the reader is marked.
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

function rail(currentPage = "title") {
  return render(
    <ContentsRail
      reading={READING}
      currentPage={currentPage}
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

  it("anchors every part into the one page", () => {
    rail();

    // Named loosely: every rail entry carries a numeral beside its title, so
    // the accessible name is "· The people" rather than the title alone.
    for (const [name, href] of [
      [/title page/i, "#title"],
      [/ellsworth lane/i, `#${READING.chapters[0].id}`],
      [/the people/i, "#people"],
      [/colophon/i, "#colophon"],
    ] as const) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("marks the part under the reader", () => {
    rail("people");

    expect(screen.getByRole("link", { name: /the people/i })).toHaveAttribute(
      "aria-current",
      "location",
    );
    expect(
      screen.getByRole("link", { name: /title page/i }),
    ).not.toHaveAttribute("aria-current");
  });
});
