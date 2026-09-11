import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";

import { PageEditor } from "@/features/memoir/components/PageEditor";
import type { Chapter } from "@/features/memoir/schemas";
import { makeQueryClient } from "@/lib/query/client";

/**
 * The editor is where the owner overrules the draft, so what is tested is what
 * reaches the request: the whole page, in the order it will be read, with the
 * words they typed and the photograph where they put it.
 *
 * `api.ts` is mocked and nothing below it is — the hook, the query client and
 * the Zod request schema stay real, following the pattern in
 * `features/archive/components/PlanOutline.test.tsx`. A test that stubbed the
 * hook would pass while the payload was wrong, which is the only thing worth
 * checking here.
 */
vi.mock("@/features/memoir/api", () => ({
  editChapter: vi.fn(),
  getOwnerChapter: vi.fn(),
  getOwnerReading: vi.fn(),
  listThreads: vi.fn(),
  postComment: vi.fn(),
}));

const { editChapter } = await import("@/features/memoir/api");

const FIRST = "11111111-1111-4111-8111-111111111111";
const SECOND = "22222222-2222-4222-8222-222222222222";
const PLATE = "33333333-3333-4333-8333-333333333333";

const CHAPTER: Chapter = {
  id: "44444444-4444-4444-8444-444444444444",
  memoir_id: "55555555-5555-4555-8555-555555555555",
  ordinal: 0,
  title: "The House on Ellsworth Lane",
  from_year: 1928,
  through_year: 1934,
  told_by: ["Margaret Reyes"],
  memory_count: 3,
  threads: [],
  blocks: [
    {
      id: FIRST,
      ordinal: 0,
      kind: "paragraph",
      text: "The cedar planks had soaked in July heat.",
      figure: null,
      sources: [],
    },
    {
      id: SECOND,
      ordinal: 1,
      kind: "paragraph",
      text: "He counted the ripple rings behind our canoe.",
      figure: null,
      sources: [],
    },
    {
      id: PLATE,
      ordinal: 2,
      kind: "figure",
      text: null,
      figure: {
        asset_id: "66666666-6666-4666-8666-666666666666",
        url: null,
        placement: "margin",
        anchor_block_id: FIRST,
        caption: "The dock, that summer",
        credit: "Margaret Reyes",
        credit_participant_id: null,
        year: 1982,
      },
      sources: [],
    },
  ],
};

function renderEditor(chapter: Chapter = CHAPTER) {
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <PageEditor
        chapter={chapter}
        memoirId={chapter.memoir_id}
        onClose={onClose}
      />
    </QueryClientProvider>,
  );
  return { onClose };
}

const save = () => screen.getByRole("button", { name: /save this page/i });

async function sent() {
  await waitFor(() => expect(editChapter).toHaveBeenCalledTimes(1));
  return vi.mocked(editChapter).mock.calls[0][1];
}

describe("PageEditor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(editChapter).mockResolvedValue(CHAPTER);
  });

  it("cannot be saved until something changes", () => {
    renderEditor();
    expect(save()).toBeDisabled();
  });

  it("sends a reworded passage", async () => {
    const user = userEvent.setup();
    renderEditor();

    const passage = screen.getByLabelText("Passage 1");
    await user.clear(passage);
    await user.type(passage, "The cedar planks were warm.");
    await user.click(save());

    const edit = await sent();
    expect(edit.blocks?.[0]).toEqual({
      id: FIRST,
      text: "The cedar planks were warm.",
    });
  });

  it("sends the page in the order it was moved into", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(
      screen.getByRole("button", { name: "Move passage 2 earlier" }),
    );
    await user.click(save());

    const edit = await sent();
    // Array position is the reading order — the server renumbers from it, so
    // this list is the whole of what "reordered" means.
    expect(edit.blocks?.map((block) => block.id)).toEqual([
      SECOND,
      FIRST,
      PLATE,
    ]);
  });

  it("leaves a removed passage out of the request", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(
      screen.getByRole("button", { name: "Leave passage 2 out" }),
    );
    await user.click(save());

    const edit = await sent();
    expect(edit.blocks?.map((block) => block.id)).toEqual([FIRST, PLATE]);
  });

  it("removing a paragraph also drops the photograph anchored to it", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(
      screen.getByRole("button", { name: "Leave passage 1 out" }),
    );
    await user.click(save());

    const edit = await sent();
    // The database would take it anyway through the anchor cascade. Showing it
    // leave here means the owner is not surprised by what comes back.
    expect(edit.blocks?.map((block) => block.id)).toEqual([SECOND]);
  });

  it("will not let the last passage be removed", () => {
    renderEditor({ ...CHAPTER, blocks: [CHAPTER.blocks[0]] });

    // A chapter with no prose is refused by the backend anyway — and it cannot
    // hold its photographs either. Disabling it here means the owner never has
    // to be told.
    expect(
      screen.getByRole("button", { name: "Leave passage 1 out" }),
    ).toBeDisabled();
  });

  it("sends a photograph's new placement and anchor, and no text", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.selectOptions(screen.getByLabelText(/shown as/i), "inset");
    await user.selectOptions(screen.getByLabelText(/beside/i), SECOND);
    await user.click(save());

    const edit = await sent();
    expect(edit.blocks?.[2]).toEqual({
      id: PLATE,
      placement: "inset",
      anchor_block_id: SECOND,
    });
  });

  it("sends the renamed chapter", async () => {
    const user = userEvent.setup();
    renderEditor();

    const title = screen.getByLabelText("Chapter title");
    await user.clear(title);
    await user.type(title, "Summers at the lake");
    await user.click(save());

    expect((await sent()).title).toBe("Summers at the lake");
  });

  it("goes back to reading once the page is saved", async () => {
    const user = userEvent.setup();
    const { onClose } = renderEditor();

    const title = screen.getByLabelText("Chapter title");
    await user.type(title, "!");
    await user.click(save());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
