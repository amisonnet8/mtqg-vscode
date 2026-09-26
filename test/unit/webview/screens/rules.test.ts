import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMtqgClient } from '../../../../src/mtqg/client';
import type { RuleRecord } from '../../../../src/mtqg/types';
import { renderRules } from '../../../../src/webview/screens/rules';
import { createTempRepo } from '../../../helpers/tempRepo';

function rule(id: string, text: string, created: string): RuleRecord {
  return { id, kind: 'rule', text, author: { kind: 'human', name: 'test' }, created, updated: created };
}

test('renderRules sorts newest-first by created, regardless of input order', () => {
  const html = renderRules([
    rule('a', 'oldest', '2026-01-01T00:00:00Z'),
    rule('b', 'newest', '2026-03-01T00:00:00Z'),
    rule('c', 'middle', '2026-02-01T00:00:00Z'),
  ]);
  const order = [...html.matchAll(/data-id="(a|b|c)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ['b', 'c', 'a']);
});

test('renderRules escapes the text and marks the cell editable with its original value', () => {
  const html = renderRules([rule('x', '<b>bold</b>', '2026-01-01T00:00:00Z')]);
  assert.match(html, /data-field="text" data-original="&lt;b&gt;bold&lt;\/b&gt;"[^>]*>&lt;b&gt;bold&lt;\/b&gt;</);
});

test('renderRules always includes an empty add row', () => {
  const html = renderRules([]);
  assert.match(html, /class="add-row"/);
  assert.match(html, /data-field="text" data-original=""/);
});

test('a real rule added through mtqg renders with its author and date', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const added = await client.ruleAdd('Write records in English');
    const record = added.data.record;
    const html = renderRules([record]);
    assert.match(html, /Write records in English/);
    assert.match(html, new RegExp(`${record.author.name} \\(${record.author.kind}\\)`));
    assert.match(html, new RegExp(`data-id="${record.id}"`));
  } finally {
    await repo.cleanup();
  }
});
