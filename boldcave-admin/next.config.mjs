import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(fileURLToPath(import.meta.url));
const storefrontApiOrigin = (
  process.env.STOREFRONT_API_ORIGIN ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: appRoot,
  },
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${storefrontApiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
