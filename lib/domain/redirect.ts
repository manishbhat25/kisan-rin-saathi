/**
 * Returns `next` only if it is a same-site path. Rejects protocol-relative URLs ("//x"),
 * backslash variants ("/\x", which browsers treat as "//x"), and control characters.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return null;
  return next;
}
