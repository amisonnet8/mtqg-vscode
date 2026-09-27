import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDate } from '../../../src/webview/screens/format';

// formatDate deliberately uses the extension host's own local time, not UTC
// (bug `062ae1c25e`'s correction, q&a `2a7f51aca969`: the point of reference
// is wherever mtqg itself runs -- the container, or the local machine with
// no container -- not the viewing device). A CI matrix runs this across
// three OSes, each with its own default timezone, so the expected value is
// built the same way (this process's own local getters) rather than
// hardcoded against one assumed timezone (e.g. UTC).
test('formatDate turns an mtqg ISO timestamp into the extension host process\'s own local date and minute', () => {
  const iso = '2026-09-26T18:26:55Z';
  const date = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  const expected = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  assert.equal(formatDate(iso), expected);
});
