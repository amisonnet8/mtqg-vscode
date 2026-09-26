import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMtqgClient } from '../../../../src/mtqg/client';
import type { TodoRecord } from '../../../../src/mtqg/types';
import { renderTodos } from '../../../../src/webview/screens/todos';
import { createTempRepo } from '../../../helpers/tempRepo';

function todo(id: string, text: string, created: string, status: 'open' | 'done' = 'open'): TodoRecord {
  return { id, kind: 'todo', text, status, author: { kind: 'human', name: 'test' }, created, updated: created };
}

function cardHtml(html: string, id: string): string {
  const match = html.match(new RegExp(`<article[^>]*data-id="${id}"[^>]*>[\\s\\S]*?</article>`));
  if (!match) {
    throw new Error(`card ${id} not found in:\n${html}`);
  }
  return match[0];
}

test('renderTodos sorts open todos newest-first by created', () => {
  const html = renderTodos([
    todo('a', 'oldest', '2026-01-01T00:00:00Z'),
    todo('b', 'newest', '2026-03-01T00:00:00Z'),
    todo('c', 'middle', '2026-02-01T00:00:00Z'),
  ]);
  const order = [...html.matchAll(/data-id="(a|b|c)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ['b', 'c', 'a']);
});

test('by default, done todos are not shown at all', () => {
  const html = renderTodos([todo('a', 'open one', '2026-01-01T00:00:00Z', 'open'), todo('b', 'done one', '2026-01-02T00:00:00Z', 'done')]);
  assert.match(html, /data-id="a"/);
  assert.doesNotMatch(html, /data-id="b"/);
  assert.doesNotMatch(html, /done-heading/);
});

test('with all:true, done todos are grouped under a "Done" heading below the open ones', () => {
  const html = renderTodos(
    [todo('a', 'open one', '2026-01-01T00:00:00Z', 'open'), todo('b', 'done one', '2026-01-02T00:00:00Z', 'done')],
    { all: true },
  );
  assert.match(html, /data-id="a"/);
  assert.match(html, /data-id="b"/);
  assert.match(html, /Done \(1\)/);
  const openIndex = html.indexOf('data-id="a"');
  const headingIndex = html.indexOf('done-heading');
  const doneIndex = html.indexOf('data-id="b"');
  assert.ok(openIndex < headingIndex && headingIndex < doneIndex);
});

test('a done card is checked and marked .done (not colour alone)', () => {
  const html = renderTodos([todo('a', 'finished', '2026-01-01T00:00:00Z', 'done')], { all: true });
  const card = cardHtml(html, 'a');
  assert.match(card, /class="card done"/);
  assert.match(card, /checked/);
});

test('an open card is unchecked and not marked .done', () => {
  const card = cardHtml(renderTodos([todo('a', 'pending', '2026-01-01T00:00:00Z', 'open')]), 'a');
  assert.doesNotMatch(card, /class="card done"/);
  assert.doesNotMatch(card, /checked/);
});

test('the card text is editable with the exact original value, and escaped', () => {
  const card = cardHtml(renderTodos([todo('a', '<b>bold</b>', '2026-01-01T00:00:00Z')]), 'a');
  assert.match(card, /data-field="text" data-original="&lt;b&gt;bold&lt;\/b&gt;"/);
  assert.doesNotMatch(card, /<b>bold<\/b>/);
});

test('the toolbar always includes an empty add field', () => {
  const html = renderTodos([]);
  assert.match(html, /class="add-row"/);
  assert.match(html, /data-field="text" data-original=""/);
});

test('a real todo added through mtqg renders with its author and date', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const added = await client.todoAdd('write more tests');
    const record = added.data.record;
    const html = renderTodos([record]);
    assert.match(html, /write more tests/);
    assert.match(html, new RegExp(`${record.author.name} \\(${record.author.kind}\\)`));
  } finally {
    await repo.cleanup();
  }
});
