/**
 * Validates that a URL is safe to render in <a href="...">.
 * Strictly permits only http: and https: protocols.
 * Blocks javascript:, data:, vbscript:, file:, etc.
 */
export function isSafeUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false
  const trimmed = url.trim()
  if (!trimmed) return false

  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Normalizes and returns a safe URL, or '#' if unsafe.
 */
export function sanitizeHref(url?: string | null): string {
  if (isSafeUrl(url)) {
    return (url || "").trim()
  }
  return "#"
}

/**
 * Escapes raw HTML characters to prevent XSS.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Sanitizes search snippet text with highlight tags.
 * Preserves ONLY `<mark class="highlight-term">` and `</mark>`.
 * All other HTML tags and special characters are escaped.
 */
export function sanitizeHighlightHtml(dirtySnippet?: string | null): string {
  if (!dirtySnippet || typeof dirtySnippet !== "string") return ""

  // Split by the known highlight markers
  const openToken = "___OPEN_MARK___"
  const closeToken = "___CLOSE_MARK___"

  const tokenized = dirtySnippet
    .replace(/<mark(?:\s+class="[^"]*")?>/gi, openToken)
    .replace(/<\/mark>/gi, closeToken)

  // Escape everything
  const escaped = escapeHtml(tokenized)

  // Re-inject safe mark tags
  return escaped
    .replace(new RegExp(openToken, "g"), '<mark class="highlight-term">')
    .replace(new RegExp(closeToken, "g"), "</mark>")
}
