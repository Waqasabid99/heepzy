export default function robots() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/checkout", "/cart", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
