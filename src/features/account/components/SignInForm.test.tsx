import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SignInForm } from "@/features/account/components/SignInForm";

/**
 * Signing in is two fields and a redirect, and all three of those are easy to
 * break without noticing — a form that validates locally and never sends, or
 * one that sends and never navigates, both look fine in a screenshot.
 *
 * Supabase and the router are mocked because they are the boundary. Everything
 * between them — the resolver, the schema's messages, the error surface — stays
 * real, which is where the behaviour actually lives.
 */
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  signInWithPassword: vi.fn(),
  signInWithGoogle: vi.fn(),
  supabase: { auth: { onAuthStateChange: vi.fn() } },
}));

vi.mock("@/hooks/useSupabaseSession", () => ({
  useSupabaseSession: () => ({ session: null, isPending: false }),
}));

const { signInWithPassword } = await import("@/lib/supabase/client");

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs in and goes to the archive", async () => {
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.type(screen.getByLabelText(/email/i), "keeper@example.test");
    await user.type(screen.getByLabelText(/password/i), "a real password");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith(
        "keeper@example.test",
        "a real password",
      ),
    );
    expect(replace).toHaveBeenCalledWith("/archive");
  });

  it("does not send an invalid email", async () => {
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.type(screen.getByLabelText(/password/i), "whatever");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("shows what Supabase said and stays put", async () => {
    vi.mocked(signInWithPassword).mockRejectedValueOnce(
      new Error("Invalid login credentials"),
    );
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.type(screen.getByLabelText(/email/i), "keeper@example.test");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    // One message for a wrong password and for an email that has no account:
    // telling them apart says which addresses have memoirs here.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid login credentials",
    );
    expect(replace).not.toHaveBeenCalled();
  });
});
