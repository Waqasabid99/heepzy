/** Only allow same-site relative paths in ?next= to prevent open redirects. */
export function safeRedirectPath(value, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
