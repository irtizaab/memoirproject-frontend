import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";

import { PageEditor } from "@/features/memoir/components/PageEditor";
import type { Chapter } from "@/features/memoir/schemas";
import { makeQueryClient } from "@/lib/query/client";

/**
 * `api.ts` is mocked and nothing below it is — the hook, the query client and
 * the Zod request schema stay real. `features/archive` is mocked at its
 * public surface: the editor only borrows its list and its composer.
 */
vi.mock("@/features/memoir/api", () => ({
  editChapter: vi.fn(),
  getOwnerChapter: vi.fn(),
  getOwnerReading: vi.fn(),
  listThreads: vi.fn(),
  postComment: vi.fn(),
}));

const createMemory = vi.fn();
vi.mock("@/features/archive", () => ({
  formatHappenedOn: () => null,
  labelForKind: (kind: string) => kind,
  useMemories: () => ({ data: ARCHIVE }),
  useCreateMemory: () => ({
    mutate: createMemory,
    isPending: false,
    isError: false,
  }),
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
        medium: "image",
        url: null,
        placement: "carousel",
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

const WRITTEN = "77777777-7777-4777-8777-777777777777";
const UNSPOKEN = "88888888-8888-4888-8888-888888888888";

const memory = (id: string, over: Record<string, unknown>) => ({
  id,
  memoir_id: CHAPTER.memoir_id,
  kind: "text",
  title: null,
  body_text: "The piano went to a cousin.",
  happened_on: null,
  created_at: "2026-01-01T00:00:00Z",
  contributor_name: "Nasreen Fatima",
  contributor_relationship: "self",
  participant_id: "99999999-9999-4999-8999-999999999999",
  is_owner: true,
  assets: [],
  ...over,
});

const ARCHIVE = [
  memory(WRITTEN, {}),
  memory(UNSPOKEN, {
    kind: "voice",
    body_text: null,
    assets: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        kind: "audio",
        mime_type: "audio/webm",
        byte_size: 10,
        duration_ms: 4000,
        url: null,
        transcript: { status: "processing" },
      },
    ],
  }),
];

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
    createMemory.mockReset();
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

  it("sends a photograph's new anchor, and no text", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.selectOptions(screen.getByLabelText(/beside/i), SECOND);
    await user.click(save());

    const edit = await sent();
    expect(edit.blocks?.[2]).toEqual({ id: PLATE, anchor_block_id: SECOND });
  });

  it("shows a placed recording as a player beside its anchor", () => {
    const [first, second, plate] = CHAPTER.blocks;
    renderEditor({
      ...CHAPTER,
      blocks: [
        first,
        second,
        {
          ...plate,
          figure: {
            ...plate.figure!,
            medium: "audio",
            url: "https://storage.test/read/voice.webm",
          },
        },
      ],
    });

    expect(screen.getByText("Recording")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Recording by Margaret Reyes"),
    ).toHaveAttribute("src", "https://storage.test/read/voice.webm");
    expect(screen.getByRole("combobox", { name: "Beside" })).toBeInTheDocument();
  });

  it("adds a memory from the archive at the chosen place", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(
      screen.getAllByRole("button", { name: /add a section here/i })[1],
    );
    await user.click(
      screen.getByRole("button", { name: /the piano went to a cousin/i }),
    );
    await user.click(save());

    const edit = await sent();
    expect(edit.blocks?.map((b) => b.id ?? b.memory_id)).toEqual([
      FIRST,
      WRITTEN,
      SECOND,
      PLATE,
    ]);
  });

  it("will not place a recording that has no words yet", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(
      screen.getAllByRole("button", { name: /add a section here/i })[0],
    );
    expect(
      screen.getByRole("button", { name: /not transcribed yet/i }),
    ).toBeDisabled();
  });

  it("saves the owner's own words to the archive before placing them", async () => {
    const user = userEvent.setup();
    createMemory.mockImplementation(
      (_body: unknown, opts: { onSuccess: (m: unknown) => void }) =>
        opts.onSuccess(memory(WRITTEN, { body_text: "Written here." })),
    );
    renderEditor();

    await user.click(
      screen.getAllByRole("button", { name: /add a section here/i })[0],
    );
    await user.type(screen.getByLabelText("New section"), "Written here.");
    await user.click(
      screen.getByRole("button", { name: /save to the archive/i }),
    );

    expect(createMemory.mock.calls[0][0]).toEqual({
      body_text: "Written here.",
    });
    await user.click(save());
    const edit = await sent();
    expect(edit.blocks?.[0]).toEqual({ memory_id: WRITTEN });
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
