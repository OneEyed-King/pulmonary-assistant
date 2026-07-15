/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a minimal, self-contained .next/standalone build for the Docker image.
  output: "standalone",
};

export default nextConfig;
