/**
 * Formats an mtqg timestamp (`created`/`updated`, ISO 8601 UTC) as UTC text.
 * A fixed slice rather than `Date#toLocaleString` so the result is
 * deterministic in tests and does not depend on this (Node-side) process's
 * locale/timezone data, which is not necessarily the viewer's (bug
 * `062ae1c25e`: the extension host can run remotely -- devcontainer, SSH --
 * on a different timezone than the VS Code window the human is actually
 * looking at).
 *
 * This is only ever used as the pre-JS fallback text inside the element
 * `table.ts`'s `dateSpan` builds; the Webview's fixed script
 * (`client/main.ts`) replaces it with the *viewer's* local time on render,
 * using the same `data-iso` attribute that carries the original timestamp.
 */
export function formatDate(iso: string): string {
  return iso.replace('T', ' ').replace('Z', '').slice(0, 16);
}
