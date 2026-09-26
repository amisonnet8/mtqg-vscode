import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDate } from '../../../src/webview/screens/format';

test('formatDate turns an mtqg ISO timestamp into a readable date and minute', () => {
  assert.equal(formatDate('2026-09-26T18:26:55Z'), '2026-09-26 18:26');
});
