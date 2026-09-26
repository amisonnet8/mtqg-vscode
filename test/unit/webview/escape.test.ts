import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escapeHtml } from '../../../src/webview/shared/escape';

test('escapeHtml escapes the five characters that matter inside an HTML string', () => {
  assert.equal(escapeHtml(`<script>alert("hi") & 'bye'</script>`), '&lt;script&gt;alert(&quot;hi&quot;) &amp; &#39;bye&#39;&lt;/script&gt;');
});

test('escapeHtml leaves ordinary text untouched', () => {
  assert.equal(escapeHtml('fix the parser bug'), 'fix the parser bug');
});
