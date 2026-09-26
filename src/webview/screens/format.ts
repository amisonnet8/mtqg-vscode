/**
 * Formats an mtqg timestamp (`created`/`updated`, ISO 8601 UTC) for display.
 * A fixed slice rather than `Date#toLocaleString` so the result does not
 * depend on the host's locale/timezone data and stays deterministic in
 * tests.
 */
export function formatDate(iso: string): string {
  return iso.replace('T', ' ').replace('Z', '').slice(0, 16);
}
