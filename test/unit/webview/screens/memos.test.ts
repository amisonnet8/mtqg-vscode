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

// mtqg v0.4.0: `log --json --events` includes deleted records (`deleted:
// true`, plus an `op:"delete"` event of their own) instead of hiding them
// entirely -- the trace ui.md calls for (q&a `36a56edded8e`, `c379a8d90bb9`).

test('renderMemos replaces a deleted memo\'s body with a trace, and drops its edit/delete controls', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const added = await client.memoAdd('gone tomorrow');
    await client.delete(added.data.record.id);
    const log = await client.log({ events: true });

    const html = renderMemos(log.data.records);
    assert.match(html, /Deleted a memo/);
    assert.doesNotMatch(html, /gone tomorrow/);
    assert.doesNotMatch(html, /data-action="delete"/);
    // The only `editable` on the page is the composer's own add-row, not
    // something inside the deleted post.
    assert.equal((html.match(/class="editable"/g) ?? []).length, 1);
  } finally {
    await repo.cleanup();
  }
});

test('renderMemos shows who deleted a post and when, from its own delete event', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const added = await client.ruleAdd('will be revoked');
    await client.delete(added.data.record.id);
    const log = await client.log({ events: true });

    const html = renderMemos(log.data.records);
    assert.match(html, /Deleted a rule/);
    // The meta line reads "deleted <date>" (from the delete event), not the
    // plain creation date -- ui.md's "削除の事実を追記し、消えないことを正直に見せる".
    assert.match(html, /deleted \d{4}-\d{2}-\d{2}/);
  } finally {
    await repo.cleanup();
  }
});

test('renderMemos summarizes answers hidden by a deleted question as a count, not individually', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const asked = await client.qaAsk('Should we cache this?');
    await client.qaAnswer(asked.data.record.id, 'Yes, in v2');
    await client.qaAnswer(asked.data.record.id, 'Actually no');
    await client.delete(asked.data.record.id);
    const log = await client.log({ events: true });

    const html = renderMemos(log.data.records);
    assert.match(html, /Deleted a question/);
    assert.match(html, /2 answers hidden with it/);
    assert.doesNotMatch(html, /Yes, in v2/);
    assert.doesNotMatch(html, /Actually no/);
  } finally {
    await repo.cleanup();
  }
});

test('renderMemos shows a deleted answer as a trace row inside its still-open question\'s thread', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const asked = await client.qaAsk('Should we cache this?');
    const answered = await client.qaAnswer(asked.data.record.id, 'Yes, in v2');
    await client.delete(answered.data.record.id);
    const log = await client.log({ events: true });

    const html = renderMemos(log.data.records);
    assert.match(html, /Should we cache this\?/);
    assert.match(html, /Deleted an answer/);
    assert.doesNotMatch(html, /Yes, in v2/);
    // The question itself is untouched: still one live thread post.
    assert.equal(html.match(/class="post post-thread/g)?.length, 1);
  } finally {
    await repo.cleanup();
  }
});

test('renderMemos shows a standalone deleted-answer trace when its question is outside the loaded window', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const asked = await client.qaAsk('Should we cache this?');
    const answered = await client.qaAnswer(asked.data.record.id, 'Yes, in v2');
    await client.delete(answered.data.record.id);
    const log = await client.log({ events: true });
    const answerOnly = log.data.records.filter((r) => r.kind !== 'question');

    const html = renderMemos(answerOnly);
    assert.match(html, /Deleted an answer/);
    assert.doesNotMatch(html, /Yes, in v2/);
  } finally {
    await repo.cleanup();
  }
});

test('renderMemos counts an answer already deleted before its question, once the question is also deleted', async () => {
  // A real-device check (Xvfb+CDP, todo `01ee2706ce` follow-up) found this:
  // deleting the parent after one of its answers was already deleted on its
  // own used to make that answer disappear entirely -- neither shown as a
  // trace (its parent renders as `deletedPost`, which never calls
  // `threadPost`) nor counted (it had its own delete event, so the earlier
  // logic treated it as "not hidden by the parent").
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const asked = await client.qaAsk('Should we cache this?');
    const firstAnswer = await client.qaAnswer(asked.data.record.id, 'answer one');
    await client.qaAnswer(asked.data.record.id, 'answer two');
    await client.delete(firstAnswer.data.record.id);
    await client.delete(asked.data.record.id);
    const log = await client.log({ events: true });

    const html = renderMemos(log.data.records);
    assert.match(html, /Deleted a question/);
    assert.match(html, /2 answers hidden with it/);
    assert.doesNotMatch(html, /answer one/);
    assert.doesNotMatch(html, /answer two/);
    assert.doesNotMatch(html, /Deleted an answer/);
  } finally {
    await repo.cleanup();
  }
});

test('renderMemos shows a standalone "hidden with its deleted question" trace when the deleted parent is outside the loaded window', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const asked = await client.qaAsk('Should we cache this?');
    await client.qaAnswer(asked.data.record.id, 'Yes, in v2');
    await client.delete(asked.data.record.id);
    const log = await client.log({ events: true });
    const answerOnly = log.data.records.filter((r) => r.kind !== 'question');

    const html = renderMemos(answerOnly);
    assert.match(html, /Hidden with its deleted question/);
    assert.doesNotMatch(html, /Yes, in v2/);
  } finally {
    await repo.cleanup();
  }
});
