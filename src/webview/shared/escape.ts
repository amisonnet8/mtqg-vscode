/**
 * Escapes text for interpolation into HTML built by the host (screens.ts,
 * html.ts). Every piece of record text or mtqg error message must go
 * through this before being placed into an HTML string (q&a `0736e37fd7`:
 * HTML is assembled on the host, not the Webview, so this is the only line
 * of defense against a record's own text breaking out of its tag).
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
