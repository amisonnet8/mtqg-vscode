import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import { test } from 'node:test';
import { byCreated, formatDate } from '../../../src/webview/screens/format';

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

// The test above passes in any timezone, so it would not notice formatDate
// ignoring TZ (always printing UTC, say). Node reads TZ once at startup, so
// each timezone gets its own child process (.claude/rules/datetime.md).
const formatModule = path.resolve(__dirname, '..', '..', '..', 'src', 'webview', 'screens', 'format.js');

function formatDateIn(timeZone: string, iso: string): string {
  const script = `process.stdout.write(require(${JSON.stringify(formatModule)}).formatDate(${JSON.stringify(iso)}))`;
  return execFileSync(process.execPath, ['-e', script], { env: { ...process.env, TZ: timeZone }, encoding: 'utf8' });
}

for (const [timeZone, expected] of [
  ['UTC', '2026-09-26 18:26'],
  ['Asia/Tokyo', '2026-09-27 03:26'],
] as const) {
  test(`formatDate follows TZ=${timeZone}`, () => {
    assert.equal(formatDateIn(timeZone, '2026-09-26T18:26:55Z'), expected);
  });
}

test('byCreated orders by the moment, not by the string', () => {
  // As strings, '…T09:00:00+09:00' sorts after '…T01:00:00Z', but it is the earlier moment (00:00Z).
  const records = [
    { id: 'b', created: '2026-10-14T01:00:00Z' },
    { id: 'a', created: '2026-10-14T09:00:00+09:00' },
    { id: 'c', created: '2026-10-14T01:00:00.500Z' },
  ];
  assert.deepEqual(
    [...records].sort(byCreated).map((r) => r.id),
    ['a', 'b', 'c'],
  );
});
