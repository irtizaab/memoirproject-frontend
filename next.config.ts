import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pinned because Turbopack otherwise infers the workspace root from the
  // nearest lockfile it can find, which may sit outside this repo entirely.
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
