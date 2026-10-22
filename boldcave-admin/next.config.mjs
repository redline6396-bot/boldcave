import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(fileURLToPath(import.meta.url));
const configuredStorefrontApiOrigin =
  process.env.STOREFRONT_API_ORIGIN ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://boldcave.com"
    : "http://localhost:3000");

function getStorefrontApiOrigin(value) {
  const origin = new URL(value);
  const isLocalOrigin = ["localhost", "127.0.0.1", "::1"].includes(
    origin.hostname
  );

  // A public HTTP upstream responds with a canonical HTTPS redirect. Relaying
  // that redirect to the browser changes POST requests to GET and breaks the
  // same-origin admin session flow.
  if (
    process.env.NODE_ENV === "production" &&
    origin.protocol === "http:" &&
    !isLocalOrigin
  ) {
    origin.protocol = "https:";
  }

  return origin.origin;
}

const storefrontApiOrigin = getStorefrontApiOrigin(
  configuredStorefrontApiOrigin
);
const adminProxyBasePath = "/backend-v2";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    workerThreads: false,
    cpus: 1,
  },

  turbopack: {
    root: appRoot,
  },

  async headers() {
    return [
      {
        source: "/login",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
      {
        source: `${adminProxyBasePath}/:path*`,
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: `${adminProxyBasePath}/:path*`,
        destination: `${storefrontApiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;

if (process.env.NODE_ENV !== "production") {
  import("@opennextjs/cloudflare")
    .then((m) => m.initOpenNextCloudflareForDev())
    .catch(() => {});
}
