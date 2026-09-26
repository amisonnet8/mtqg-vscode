import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseWebviewMessage } from '../../../src/webview/shared/messages';

test('parseWebviewMessage accepts a well-formed ready message', () => {
  assert.deepEqual(parseWebviewMessage({ type: 'ready', tab: 'todos' }), { type: 'ready', tab: 'todos' });
});

test('parseWebviewMessage accepts a well-formed selectTab message', () => {
  assert.deepEqual(parseWebviewMessage({ type: 'selectTab', tab: 'bugs' }), { type: 'selectTab', tab: 'bugs' });
});

test('parseWebviewMessage rejects an unknown type', () => {
  assert.equal(parseWebviewMessage({ type: 'somethingElse', tab: 'todos' }), undefined);
});

test('parseWebviewMessage rejects an unknown tab id', () => {
  assert.equal(parseWebviewMessage({ type: 'ready', tab: 'not-a-tab' }), undefined);
});

test('parseWebviewMessage rejects non-object input', () => {
  assert.equal(parseWebviewMessage('ready'), undefined);
  assert.equal(parseWebviewMessage(null), undefined);
  assert.equal(parseWebviewMessage(undefined), undefined);
  assert.equal(parseWebviewMessage(42), undefined);
});

test('parseWebviewMessage rejects an object missing a tab', () => {
  assert.equal(parseWebviewMessage({ type: 'ready' }), undefined);
});
