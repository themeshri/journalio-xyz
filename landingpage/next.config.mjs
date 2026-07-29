/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the file-tracing root to THIS project so Next doesn't climb up to the
  // parent journalio-xyz repo (which would emit a multiple-lockfiles warning).
  outputFileTracingRoot: import.meta.dirname,
}

export default nextConfig
