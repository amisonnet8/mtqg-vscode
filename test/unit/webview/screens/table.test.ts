import assert from 'node:assert/strict';
import { test } from 'node:test';
import { copyIdButton, copyIdButtonCell, shortId } from '../../../../src/webview/screens/table';

const ID = '632bc617d7824c0c9d3b565dcaad10dc';

test('shortId is the 10-digit form mtqg context prints', () => {
  assert.equal(shortId(ID), '632bc617d7');
});

test('copyIdButton shows the short id and names the full id for assistive tech', () => {
  const html = copyIdButton(ID);
  assert.match(html, />632bc617d7<\/button>$/);
  assert.match(html, /data-action="copy-id"/);
  assert.match(html, new RegExp(`aria-label="Copy ID ${ID}"`));
  assert.match(html, new RegExp(`title="Copy ID ${ID}"`));
});

test('copyIdButtonCell wraps the same button in a td', () => {
  assert.equal(copyIdButtonCell(ID), `<td>${copyIdButton(ID)}</td>`);
});
