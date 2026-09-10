"use client";

/**
 * App-wide client providers — part of the frontend's `core` layer.
 *
 * This is the single `"use client"` boundary at the root of the tree. Keeping
 * it in one small file means `layout.tsx` stays a server component and only
 * this module (plus its children) ships to the browser.
 */

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { makeQueryClient } from "@/lib/query/client";

export function Providers({ children }: { children: ReactNode }) {
  // Created inside state, not at module scope. A module-level client would be
  // shared across every request on the server, leaking one user's cached data
  // into another's response.
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/*
        Devtools show every query and mutation, their cache keys, and their
        current state. Worth opening while reading `features/example/hooks.ts`
        — the client data path is much easier to understand when you can watch
        it. Excluded from production builds by the constant check below, which
        the bundler resolves at build time.
      */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
