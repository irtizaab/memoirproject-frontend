import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PlanOutline } from "@/features/archive/components/PlanOutline";
import type { MemoirPlan } from "@/features/archive/schemas";

/**
 * The outline is a review surface: what is tested is what the owner can read
 * off it — the chapters in order, by number, and what the reviewer and the
 * guide said. Changing it happens in the conversation with the guide, which
 * `GuideChat.test.tsx` covers.
 */
function chapter(id: string, title: string) {
  return {
    id,
    title,
    from_year: 1982,
    through_year: 1984,
    blocks: [
      {
        index: 0,
        kind: "paragraph" as const,
        text: "The cedar planks had soaked in July heat.",
        sources: [],
      },
    ],
    figures: [],
    memory_ids: [],
  };
}

const PLAN: MemoirPlan = {
  organised_by: "planner",
  reason: null,
  review: null,
  guide: null,
  generated_at: "2026-09-01T00:00:00Z",
  edited_at: null,
  assembled_at: null,
  chapters: [
    chapter("11111111-1111-4111-8111-111111111111", "Summers at the lake"),
    chapter("22222222-2222-4222-8222-222222222222", "The winters after"),
  ],
};

describe("PlanOutline", () => {
  it("shows the chapters in reading order, numbered", () => {
    render(<PlanOutline plan={PLAN} sealed={false} />);

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(/1.*Summers at the lake/);
    expect(rows[1]).toHaveTextContent(/2.*The winters after/);
    // Nothing to type into: editing is the guide's job now.
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("says which assembler organised it", () => {
    render(<PlanOutline plan={{ ...PLAN, organised_by: "by_date" }} sealed={false} />);

    // The owner should be able to tell a book the model organised from one the
    // decade fallback did. Before this, the two were indistinguishable.
    expect(screen.getByText(/divided by decade/i)).toBeInTheDocument();
  });

  it("lists what the reviewer found, and marks what it changed", () => {
    render(
      <PlanOutline
        sealed={false}
        plan={{
          ...PLAN,
          review: {
            revised: true,
            findings: [
              {
                kind: "attribution",
                chapter: "The lake",
                note: "A date nobody wrote was removed.",
                fixed: true,
              },
              {
                kind: "thin",
                chapter: null,
                note: "One memory is a single word.",
                fixed: false,
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText(/what the reviewer found/i)).toBeInTheDocument();
    expect(screen.getByText(/The lake —/)).toBeInTheDocument();
    expect(screen.getAllByText(/changed/)).toHaveLength(1);
  });

  it("shows the guide's note over the planner's bare reason", () => {
    render(
      <PlanOutline
        sealed
        plan={{
          ...PLAN,
          organised_by: "by_date",
          reason: "The model could not be reached.",
          guide: "The archive is too thin to plan from yet.",
        }}
      />,
    );

    expect(screen.getByText(/too thin to plan from/)).toBeInTheDocument();
    expect(screen.queryByText(/could not be reached/)).not.toBeInTheDocument();
    expect(screen.getByText(/how the book was organised/i)).toBeInTheDocument();
  });
});
