const isDev = process.env.NODE_ENV !== "production";

const PAYSAFE_ORIGINS = ["https://hosted.paysafe.com", "https://api.paysafe.com", "https://api.test.paysafe.com"];

/**
 * Static Content-Security-Policy. We deliberately avoid nonces: nonce-based
 * CSP forces every page to render dynamically, which would disable the static
 * shell + partial prefetching (Cache Components). Inline scripts are limited to
 * Next's own bootstrap and our theme script.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://hosted.paysafe.com`,
  "style-src 'self' 'unsafe-inline' https://hosted.paysafe.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${PAYSAFE_ORIGINS.join(" ")} ${isDev ? "ws: wss:" : ""}`,
  "frame-src https://hosted.paysafe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
]
  .join("; ")
  .replace(/\s{2,}/g, " ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(self "https://hosted.paysafe.com")',
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  experimental: {
    // Enables forbidden() / unauthorized() in the auth Data Access Layer.
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Add your CDN / media host here when product images move off the app server.
    remotePatterns: [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Never cache authenticated / transactional pages in shared caches.
      {
        source: "/(admin|account|checkout|cart)/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
