import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMtqgClient } from '../../../../src/mtqg/client';
import type { MemoRecord } from '../../../../src/webview/screens/memos';
import { renderMemos } from '../../../../src/webview/screens/memos';
import { createTempRepo } from '../../../helpers/tempRepo';

const AUTHOR = { kind: 'human' as const, name: 'test' };

function memo(id: string, text: string, created: string): MemoRecord {
  return { id, kind: 'memo', text, author: AUTHOR, created, updated: created };
}

test('renderMemos orders posts oldest-first (log itself returns newest-first)', () => {
  // Literal `created` values, not real mtqg timing: two records added
  // within the same second have an unspecified tie-break order out of
  // `log` (same finding as `todo list`/`qa list`, `.claude/rules/mtqg-cli.md`),
  // so this must use timestamps that actually differ.
  const html = renderMemos([memo('b', 'second', '2026-01-02T00:00:00Z'), memo('a', 'first', '2026-01-01T00:00:00Z')]);
  assert.ok(html.indexOf('first') < html.indexOf('second'));
});

test('renderMemos threads an answer under its question', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const asked = await client.qaAsk('Should we cache this?');
    await client.qaAnswer(asked.data.record.id, 'Yes, in v2');
    const log = await client.log({ events: true });

    const html = renderMemos(log.data.records);
    assert.match(html, /Should we cache this\?/);
    assert.match(html, /Yes, in v2/);
    // The answer is not a separate top-level post: only one <article> for
    // the question exists, plus a nested reply, not two sibling posts.
    assert.equal(html.match(/class="post post-thread/g)?.length, 1);
    assert.doesNotMatch(html, /Answered a question/);
  } finally {
    await repo.cleanup();
  }
});

test('renderMemos shows a standalone answer when its question is outside the loaded window', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const asked = await client.qaAsk('Should we cache this?');
    await client.qaAnswer(asked.data.record.id, 'Yes, in v2');
    const log = await client.log({ events: true });
    // Drop the question itself, keeping only the answer -- simulating it
    // having scrolled out of the loaded window.
    const answerOnly = log.data.records.filter((r) => r.kind !== 'question');

    const html = renderMemos(answerOnly);
    assert.match(html, /Answered a question/);
    assert.match(html, /Yes, in v2/);
  } finally {
    await repo.cleanup();
  }
});

test('renderMemos marks a post "(edited)" only after an edit, not after a status change', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const todo = await client.todoAdd('write more tests');
    await client.todoDone(todo.data.record.id);
    let log = await client.log({ events: true });
    let html = renderMemos(log.data.records);
    assert.doesNotMatch(html, /post-edited/);

    const memo = await client.memoAdd('typo her');
    await client.edit(memo.data.record.id, 'typo here');
    log = await client.log({ events: true });
    html = renderMemos(log.data.records);
    assert.match(html, /post-edited/);
  } finally {
    await repo.cleanup();
  }
});

test('renderMemos shows a "Load earlier" button only when there is more to load', () => {
  assert.doesNotMatch(renderMemos([], { hasEarlier: false }), /Load earlier/);
  assert.match(renderMemos([], { hasEarlier: true }), /Load earlier/);
});

test('renderMemos shows the notice line exactly once when set', () => {
  const html = renderMemos([], { notice: 'Undid post of "oops"' });
  assert.match(html, /Undid post of &quot;oops&quot;/);
});

test('renderMemos lists the slash commands in the same order as the tab bar (q&a 112863a3fc43)', () => {
  const html = renderMemos([]);
  assert.match(html, /\(\/todo \/qa \/bug \/rule \/glossary\)/);
});

test('renderMemos labels a glossary post "Defined a term" and a rule post "Adopted a rule"', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    await client.glossaryAdd('token', 'a lexical unit');
    await client.ruleAdd('write records in English');
    const log = await client.log({ events: true });

    const html = renderMemos(log.data.records);
    assert.match(html, /Defined a term/);
    assert.match(html, /Adopted a rule/);
    // The exact definition text, not a substring with a stray separator
    // (mtqg-cli.md: the class of bug `--` position mistakes cause).
    assert.match(html, /data-original="a lexical unit"/);
  } finally {
    await repo.cleanup();
  }
});
