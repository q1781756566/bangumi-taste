import type { NextConfig } from "next";

const isGHPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGHPages ? "/bangumi-taste" : "",
  assetPrefix: isGHPages ? "/bangumi-taste/" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
