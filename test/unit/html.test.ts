import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderShell } from '../../src/webview/shared/html';

test('renderShell sets a strict CSP with no default sources', () => {
  const html = renderShell({ cspSource: 'vscode-webview://abc', nonce: 'test-nonce' });
  assert.match(html, /default-src 'none'/);
});

test('renderShell allow-lists only this render\'s own nonce', () => {
  const html = renderShell({ cspSource: 'vscode-webview://abc', nonce: 'my-nonce-123' });
  assert.match(html, /'nonce-my-nonce-123'/);
  assert.match(html, /nonce="my-nonce-123"/);
});

test('renderShell scopes style-src to the webview\'s own cspSource', () => {
  const html = renderShell({ cspSource: 'vscode-webview://abc', nonce: 'n' });
  assert.match(html, /style-src vscode-webview:\/\/abc 'nonce-n'/);
});
