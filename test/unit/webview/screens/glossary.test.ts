import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMtqgClient } from '../../../../src/mtqg/client';
import type { GlossaryRecord } from '../../../../src/mtqg/types';
import { renderGlossary } from '../../../../src/webview/screens/glossary';
import { createTempRepo } from '../../../helpers/tempRepo';

function entry(id: string, word: string, text: string, created: string): GlossaryRecord {
  return { id, kind: 'glossary', word, text, author: { kind: 'human', name: 'test' }, created, updated: created };
}

function rowHtml(html: string, id: string): string {
  const match = html.match(new RegExp(`<tr data-id="${id}">[\\s\\S]*?</tr>`));
  if (!match) {
    throw new Error(`row ${id} not found in:\n${html}`);
  }
  return match[0];
}

test('renderGlossary sorts newest-first by created', () => {
  const html = renderGlossary([
    entry('a', 'alpha', 'first', '2026-01-01T00:00:00Z'),
    entry('b', 'beta', 'second', '2026-02-01T00:00:00Z'),
  ]);
  const order = [...html.matchAll(/data-id="(a|b)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ['b', 'a']);
});

test('renderGlossary flags every entry that shares a word with a badge, not color alone', () => {
  const html = renderGlossary([
    entry('a', 'token', 'first definition', '2026-01-01T00:00:00Z'),
    entry('b', 'token', 'second definition', '2026-02-01T00:00:00Z'),
    entry('c', 'unique', 'only definition', '2026-03-01T00:00:00Z'),
  ]);
  assert.match(rowHtml(html, 'a'), /dup-badge/);
  assert.match(rowHtml(html, 'b'), /dup-badge/);
  assert.doesNotMatch(rowHtml(html, 'c'), /dup-badge/);
});

test('renderGlossary makes the definition editable but never the word (mtqg edit cannot change it)', () => {
  const row = rowHtml(renderGlossary([entry('a', 'token', 'a definition', '2026-01-01T00:00:00Z')]), 'a');
  assert.doesNotMatch(row, /data-field="word"/);
  assert.match(row, /data-field="text"/);
});

test('the add row lets a new term and definition be typed', () => {
  const html = renderGlossary([]);
  assert.match(html, /class="add-row"/);
  assert.match(html, /data-field="word"/);
  assert.match(html, /data-field="text"/);
});

test('a real glossary entry added through mtqg renders with its word and definition', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const added = await client.glossaryAdd('token', 'The smallest unit produced by lexing');
    const html = renderGlossary([added.data.record]);
    assert.match(html, /token/);
    assert.match(html, /The smallest unit produced by lexing/);
  } finally {
    await repo.cleanup();
  }
});
