import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Claude Agent SDK loads a bundled runtime at request time (it extracts and
  // spawns a binary from its own package). Next.js dependency tracing can miss
  // files that are only referenced at runtime, so force the whole SDK package to
  // ship with the API routes that call query(). On Vercel (Linux) `npm install`
  // pulls the Linux build, so the correct binary travels with the function.
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@anthropic-ai/claude-agent-sdk/**/*"],
  },
};

export default nextConfig;
