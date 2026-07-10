import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Claude Agent SDK spawns a NATIVE CLI binary at request time. That binary
  // ships as a SEPARATE, per-platform optional package (…-linux-x64), loaded
  // dynamically — so Next.js tracing misses it and the function fails at runtime
  // with "Native CLI binary for linux-x64 not found". Explicitly ship the SDK plus
  // the Linux native packages with the API routes. The …-linux-* globs don't exist
  // on a Windows/macOS dev box (no-op there); on Vercel's Linux build the matching
  // one is installed and gets bundled into the function.
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./node_modules/@anthropic-ai/claude-agent-sdk/**/*",
      "./node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/**/*",
      "./node_modules/@anthropic-ai/claude-agent-sdk-linux-x64-musl/**/*",
    ],
  },
};

export default nextConfig;
