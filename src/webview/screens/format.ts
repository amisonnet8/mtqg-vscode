/**
 * Formats an mtqg timestamp (`created`/`updated`, ISO 8601 UTC) in the
 * extension host's own local time -- deliberately not UTC (bug
 * `062ae1c25e`'s first fix tried converting in the Webview instead, using
 * the viewer's own device; corrected per the human's actual intent, q&a
 * `2a7f51aca969`: the point of reference should be wherever mtqg itself
 * runs -- the local machine with no container, or the container's own
 * clock with one -- not whichever device happens to be looking at the
 * screen). `Date`'s own (non-UTC-prefixed) getters already resolve against
 * this process's local timezone (`TZ`, falling back to `/etc/localtime` on
 * Linux), the same thing a plain `date` command in this container's shell
 * would show.
 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
