import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";

import { GuideChat } from "@/features/archive/components/GuideChat";
import { makeQueryClient } from "@/lib/query/client";

/**
 * Same posture as `PlanOutline.test.tsx`: the feature's `api.ts` is mocked,
 * the hooks and query client are real. What matters is what reaches the
 * request and what the owner sees while it is in flight.
 */
vi.mock("@/features/archive/api", () => ({
  listChat: vi.fn(),
  sendChat: vi.fn(),
}));

const { listChat, sendChat } = await import("@/features/archive/api");

function renderChat() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <GuideChat memoirId="memoir-1" />
    </QueryClientProvider>,
  );
}

describe("GuideChat", () => {
  beforeEach(() => {
    vi.mocked(listChat).mockReset();
    vi.mocked(sendChat).mockReset();
  });

  it("shows the conversation so far, and says when a reply rebuilt the book", async () => {
    vi.mocked(listChat).mockResolvedValue([
      {
        id: "m1",
        role: "owner",
        body: "Keep the war years together.",
        replanned: false,
        created_at: "2026-09-01T00:00:00Z",
      },
      {
        id: "m2",
        role: "guide",
        body: "Done — the war years are one chapter now.",
        replanned: true,
        created_at: "2026-09-01T00:01:00Z",
      },
    ]);

    renderChat();

    expect(
      await screen.findByText("Keep the war years together."),
    ).toBeInTheDocument();
    expect(screen.getByText(/the book was rebuilt/i)).toBeInTheDocument();
  });

  it("sends what was typed, shows it at once, and disables the box meanwhile", async () => {
    // Empty at first; after the send the server's list holds both messages,
    // which is what the hook refetches once the reply lands.
    const reply = {
      id: "g1",
      role: "guide" as const,
      body: "Because the model could not read the archive.",
      replanned: false,
      created_at: "2026-09-01T00:02:00Z",
    };
    vi.mocked(listChat).mockResolvedValueOnce([]).mockResolvedValue([
      {
        id: "o1",
        role: "owner",
        body: "Why is it by decade?",
        replanned: false,
        created_at: "2026-09-01T00:01:00Z",
      },
      reply,
    ]);
    let answer!: (value: unknown) => void;
    vi.mocked(sendChat).mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }) as never,
    );
    const user = userEvent.setup();

    renderChat();
    await user.type(
      screen.getByLabelText("Message to the guide"),
      "Why is it by decade?",
    );
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(sendChat).toHaveBeenCalledWith("memoir-1", "Why is it by decade?");
    expect(screen.getByText("Why is it by decade?")).toBeInTheDocument();
    expect(screen.getByLabelText("Message to the guide")).toBeDisabled();

    answer({ reply, plan: null });

    expect(
      await screen.findByText("Because the model could not read the archive."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText("Message to the guide")).not.toBeDisabled(),
    );
  });
});
