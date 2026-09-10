/**
 * The account menu, which is the one place in the header that can throw.
 *
 * Base UI's `Menu.GroupLabel` reads a context that only `Menu.Group` and
 * `Menu.RadioGroup` provide, and throws when neither is above it. The menu's
 * content is portaled, so the throw happens on the click that opens it and
 * never on the page that renders the trigger — which is why this needs a test
 * that actually opens the menu rather than one that renders the header.
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AppHeader } from "@/components/layout/AppHeader";
import { makeQueryClient } from "@/lib/query/client";

vi.mock("next/navigation", () => ({
  usePathname: () => "/archive",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/hooks/useSupabaseSession", () => ({
  useSupabaseSession: () => ({
    session: {
      user: {
        email: "irtiza.abbas@example.com",
        user_metadata: { full_name: "Irtiza Abbas" },
      },
    },
    isPending: false,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));

function renderHeader() {
  const queryClient = makeQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<AppHeader />, { wrapper });
}

describe("AppHeader account menu", () => {
  it("opens without throwing and shows the account, appearance and sign out", async () => {
    renderHeader();

    // Initials, not the whole name: "Irtiza Abbas" -> "IA".
    const trigger = screen.getByRole("button", {
      name: /account and appearance/i,
    });
    expect(trigger).toHaveTextContent("IA");

    await userEvent.click(trigger);

    expect(
      await screen.findByText("irtiza.abbas@example.com"),
    ).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: /system/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /sign out/i }),
    ).toBeInTheDocument();
  });

  it("labels the theme radio group with the Appearance heading", async () => {
    renderHeader();

    await userEvent.click(
      screen.getByRole("button", { name: /account and appearance/i }),
    );

    // aria-labelledby is the whole reason GroupLabel needs a group above it.
    // If the label is ever moved back outside the radio group this fails
    // before the render does.
    expect(
      await screen.findByRole("group", { name: "Appearance" }),
    ).toBeInTheDocument();
  });
});
