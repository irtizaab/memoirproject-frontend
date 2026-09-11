import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";

import { PlanOutline } from "@/features/archive/components/PlanOutline";
import type { MemoirPlan } from "@/features/archive/schemas";
import { makeQueryClient } from "@/lib/query/client";

/**
 * The outline is where the owner overrules the model, so what is tested here is
 * what reaches the request: the chapters, in the order they will be read, with
 * the titles the owner chose.
 *
 * The feature's `api.ts` is mocked and nothing below it is — the hook, the
 * query client and the Zod schemas stay real, following the pattern in
 * `features/example`. A test that stubbed the hook instead would pass while the
 * payload was wrong, which is the only thing worth checking here.
 */
vi.mock("@/features/archive/api", () => ({
  updatePlan: vi.fn(),
}));

const { updatePlan } = await import("@/features/archive/api");

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
  generated_at: "2026-09-01T00:00:00Z",
  edited_at: null,
  assembled_at: null,
  chapters: [
    chapter("11111111-1111-4111-8111-111111111111", "Summers at the lake"),
    chapter("22222222-2222-4222-8222-222222222222", "The winters after"),
  ],
};

function renderOutline(plan: MemoirPlan = PLAN, readOnly = false) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <PlanOutline plan={plan} memoirId="memoir-1" readOnly={readOnly} />
    </QueryClientProvider>,
  );
}

describe("PlanOutline", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(updatePlan).mockResolvedValue(PLAN);
  });

  it("shows the chapters in reading order", () => {
    renderOutline();

    const titles = screen.getAllByRole("textbox").map((input) => input);
    expect(titles).toHaveLength(2);
    expect(titles[0]).toHaveValue("Summers at the lake");
    expect(titles[1]).toHaveValue("The winters after");
  });

  it("says which assembler organised it", () => {
    renderOutline({ ...PLAN, organised_by: "by_date" });

    // The owner should be able to tell a book the model organised from one the
    // decade fallback did. Before this, the two were indistinguishable.
    expect(screen.getByText(/divided by decade/i)).toBeInTheDocument();
  });

  it("cannot be saved until something changes", () => {
    renderOutline();

    expect(screen.getByRole("button", { name: /save the outline/i })).toBeDisabled();
  });

  it("sends a renamed chapter", async () => {
    const user = userEvent.setup();
    renderOutline();

    const title = screen.getByLabelText("Title of chapter 1");
    await user.clear(title);
    await user.type(title, "The dock");
    await user.click(screen.getByRole("button", { name: /save the outline/i }));

    await waitFor(() => expect(updatePlan).toHaveBeenCalledTimes(1));
    const [, chapters] = vi.mocked(updatePlan).mock.calls[0];
    expect(chapters.map((c) => c.title)).toEqual([
      "The dock",
      "The winters after",
    ]);
  });

  it("sends the chapters in the order they were moved into", async () => {
    const user = userEvent.setup();
    renderOutline();

    await user.click(
      screen.getByRole("button", { name: "Move chapter 2 earlier" }),
    );
    await user.click(screen.getByRole("button", { name: /save the outline/i }));

    await waitFor(() => expect(updatePlan).toHaveBeenCalledTimes(1));
    const [, chapters] = vi.mocked(updatePlan).mock.calls[0];
    // Array position is the reading order — the server renumbers from it, so
    // this list is the whole of what "reordered" means.
    expect(chapters.map((c) => c.id)).toEqual([
      "22222222-2222-4222-8222-222222222222",
      "11111111-1111-4111-8111-111111111111",
    ]);
  });

  it("leaves a dropped chapter out of the request", async () => {
    const user = userEvent.setup();
    renderOutline();

    await user.click(
      screen.getByRole("button", { name: "Leave chapter 1 out" }),
    );
    await user.click(screen.getByRole("button", { name: /save the outline/i }));

    await waitFor(() => expect(updatePlan).toHaveBeenCalledTimes(1));
    const [, chapters] = vi.mocked(updatePlan).mock.calls[0];
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe("The winters after");
  });

  it("will not let the last chapter be dropped", () => {
    renderOutline({ ...PLAN, chapters: [PLAN.chapters[0]] });

    // A plan with no chapters is refused by the backend anyway; disabling it
    // here means the owner never has to be told.
    expect(
      screen.getByRole("button", { name: "Leave chapter 1 out" }),
    ).toBeDisabled();
  });

  it("offers nothing to change once the book was built from it", () => {
    renderOutline({ ...PLAN, assembled_at: "2026-09-02T00:00:00Z" }, true);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /save the outline/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Summers at the lake")).toBeInTheDocument();
  });
});
