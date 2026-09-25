/** Escapes a literal string for use inside a RegExp, so "Amazon.com" or "AT&T (T)" match only themselves. */
export const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
