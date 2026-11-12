/**
 * Convert Prisma results into plain, serialisable objects so they can cross
 * the server→client boundary and be stored by `use cache`.
 * Decimal → string (keep precision; format with lib/money), Date → ISO string,
 * BigInt → string.
 */
export function toPlain(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === "object") {
    // Prisma.Decimal (decimal.js) instances
    if (typeof value.toFixed === "function" && typeof value.isFinite === "function") {
      return value.toFixed(2);
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = toPlain(v);
    return out;
  }
  return value;
}
