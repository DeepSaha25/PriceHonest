import dotenv from "dotenv";
import path from "path";

// src/ and dist/ have the same depth; loading never depends on the launch cwd.
// Offline tests explicitly disable env loading and inject their own providers.
if (process.env.PRICEHONEST_SKIP_ENV !== "true") {
  dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
}

export const ANALYSIS_VERSION = "trusted-comparison-v2";
