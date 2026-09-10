/**
 * Boundary tests. `fetch` is stubbed, so these run without a backend and
 * verify the one guarantee the rest of the app depends on: every failure
 * arrives as an `ApiError` with the right `code`.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

const schema = z.object({ message: z.string() });

function stubFetch(response: Response | Promise<never>) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockReturnValue(
      response instanceof Response ? Promise.resolve(response) : response,
    );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => vi.restoreAllMocks());

describe("apiRequest", () => {
  it("returns the parsed body on success", async () => {
    stubFetch(jsonResponse({ message: "Hello!" }));

    await expect(apiRequest({ path: "/x", schema })).resolves.toEqual({
      message: "Hello!",
    });
  });

  it("prefixes the path with the configured base URL", async () => {
    const fetchMock = stubFetch(jsonResponse({ message: "Hello!" }));

    await apiRequest({ path: "/example/greet", schema });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/example/greet",
      expect.anything(),
    );
  });

  it("turns an unreachable backend into a `network` error", async () => {
    stubFetch(Promise.reject(new TypeError("fetch failed")));

    const error = await apiRequest({ path: "/x", schema }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("network");
  });

  it("turns a non-2xx response into an `http` error carrying FastAPI's detail", async () => {
    stubFetch(jsonResponse({ detail: "Something broke" }, 500));

    const error = await apiRequest({ path: "/x", schema }).catch((e) => e);

    expect(error.code).toBe("http");
    expect(error.status).toBe(500);
    expect(error.message).toBe("Something broke");
  });

  it("unwraps FastAPI's 422 validation detail array", async () => {
    stubFetch(
      jsonResponse(
        { detail: [{ loc: ["body", "name"], msg: "field required" }] },
        422,
      ),
    );

    const error = await apiRequest({ path: "/x", schema }).catch((e) => e);

    expect(error.message).toBe("field required");
    expect(error.isClientError).toBe(true);
  });

  it("turns an unexpected response shape into a `contract` error", async () => {
    // A 200 with the wrong body — the drift case the schema exists to catch.
    stubFetch(jsonResponse({ msg: "Hello!" }));

    const error = await apiRequest({ path: "/x", schema }).catch((e) => e);

    expect(error.code).toBe("contract");
    expect(error.message).toContain("message");
  });
});
