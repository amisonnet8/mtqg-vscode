import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderShell } from '../../src/webview/shared/html';
import { TAB_IDS, TAB_LABELS, DEFAULT_TAB } from '../../src/webview/shared/tabs';

function render() {
  return renderShell({ cspSource: 'vscode-webview://abc', nonce: 'test-nonce', scriptUri: 'vscode-webview://abc/main.js' });
}

test('renderShell sets a strict CSP with no default sources', () => {
  const html = render();
  assert.match(html, /default-src 'none'/);
});

test('renderShell allow-lists only this render\'s own nonce', () => {
  const html = renderShell({ cspSource: 'vscode-webview://abc', nonce: 'my-nonce-123', scriptUri: 'x' });
  assert.match(html, /'nonce-my-nonce-123'/);
  assert.match(html, /nonce="my-nonce-123"/);
});

test('renderShell scopes style-src to the webview\'s own cspSource', () => {
  const html = renderShell({ cspSource: 'vscode-webview://abc', nonce: 'n', scriptUri: 'x' });
  assert.match(html, /style-src vscode-webview:\/\/abc 'nonce-n'/);
});

test('renderShell references the client script with the given nonce', () => {
  const html = renderShell({ cspSource: 'vscode-webview://abc', nonce: 'n', scriptUri: 'https://example/main.js' });
  assert.match(html, /<script nonce="n" src="https:\/\/example\/main\.js"><\/script>/);
});

test('renderShell keeps the tab bar pinned to the top while the panel scrolls (human\'s request, q&a 70787501f3f3)', () => {
  const html = render();
  const styleBlock = html.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? '';
  const tablistRule = styleBlock.match(/\[role="tablist"\]\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(tablistRule, /position:\s*sticky/);
  assert.match(tablistRule, /top:\s*0/);
});

test('renderShell renders one tab and one tabpanel per screen, in ui.md\'s order', () => {
  const html = render();
  for (const id of TAB_IDS) {
    assert.match(html, new RegExp(`role="tab" id="tab-${id}"[^>]*>${TAB_LABELS[id]}<`));
    assert.match(html, new RegExp(`role="tabpanel" id="panel-${id}"`));
  }
});

test('renderShell marks only the default tab as selected and visible', () => {
  const html = render();
  for (const id of TAB_IDS) {
    const expectedSelected = id === DEFAULT_TAB ? 'true' : 'false';
    assert.match(html, new RegExp(`id="tab-${id}" aria-controls="panel-${id}" aria-selected="${expectedSelected}"`));
  }
  assert.doesNotMatch(html, new RegExp(`id="panel-${DEFAULT_TAB}"[^>]*\\shidden`));
  const nonDefault = TAB_IDS.filter((id) => id !== DEFAULT_TAB);
  for (const id of nonDefault) {
    assert.match(html, new RegExp(`id="panel-${id}"[^>]*\\shidden`));
  }
});
