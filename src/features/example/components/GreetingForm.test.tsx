/**
 * Component tests. The feature's `api.ts` is mocked, so this exercises the
 * component and its hook without HTTP — fast, and failures point at the UI
 * rather than at the network.
 *
 * Note what is NOT mocked: the hook, the query client, the schemas. Mocking at
 * the outermost layer keeps the test honest about how the pieces fit together.
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { makeQueryClient } from "@/lib/query/client";
import { GreetingForm } from "@/features/example/components/GreetingForm";

vi.mock("@/features/example/api", () => ({
  postGreeting: vi.fn(),
}));

const { postGreeting } = await import("@/features/example/api");
const postGreetingMock = vi.mocked(postGreeting);

function renderForm() {
  const queryClient = makeQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<GreetingForm />, { wrapper });
}

beforeEach(() => vi.resetAllMocks());

describe("GreetingForm", () => {
  it("disables submission until a name is entered", async () => {
    renderForm();

    const submit = screen.getByRole("button", { name: /greet/i });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/name/i), "Ada");
    expect(submit).toBeEnabled();
  });

  it("shows the schema's own message and never calls the API when input is invalid", async () => {
    renderForm();

    // Whitespace only: the schema trims, so this is an empty name.
    await userEvent.type(screen.getByLabelText(/name/i), "   ");

    // The message is the one written in `schemas.ts`, not in the component.
    expect(await screen.findByText("Please enter a name.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /greet/i })).toBeDisabled();
    expect(postGreetingMock).not.toHaveBeenCalled();
  });

  it("sends the entered name and renders the response", async () => {
    postGreetingMock.mockResolvedValue({
      message: "Hello, Ada!",
      success: true,
      error: null,
    });

    renderForm();

    await userEvent.type(screen.getByLabelText(/name/i), "Ada");
    await userEvent.click(screen.getByRole("button", { name: /greet/i }));

    expect(await screen.findByText("Hello, Ada!")).toBeInTheDocument();
    expect(postGreetingMock).toHaveBeenCalledWith({
      name: "Ada",
      excited: true,
    });
  });

  it("explains a contract mismatch rather than showing a generic failure", async () => {
    postGreetingMock.mockRejectedValue(
      ApiError.contract(
        "http://backend.test/example/greet",
        "message (required)",
      ),
    );

    renderForm();

    await userEvent.type(screen.getByLabelText(/name/i), "Ada");
    await userEvent.click(screen.getByRole("button", { name: /greet/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/contract mismatch/i);
    expect(alert).toHaveTextContent(/schemas\.ts/);
  });

  it("reports an unreachable backend", async () => {
    postGreetingMock.mockRejectedValue(
      ApiError.network(
        "http://backend.test/example/greet",
        new TypeError("fetch failed"),
      ),
    );

    renderForm();

    await userEvent.type(screen.getByLabelText(/name/i), "Ada");
    await userEvent.click(screen.getByRole("button", { name: /greet/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /cannot reach the backend/i,
    );
  });
});
