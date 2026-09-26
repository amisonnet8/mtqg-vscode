import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMtqgClient } from '../../../../src/mtqg/client';
import type { AnswerRecord, QuestionRecord } from '../../../../src/mtqg/types';
import { renderQuestions } from '../../../../src/webview/screens/questions';
import { createTempRepo } from '../../../helpers/tempRepo';

function reply(id: string, text: string, created: string, kind: 'ai' | 'human' = 'ai'): AnswerRecord {
  return { id, kind: 'answer', text, re: 'q', author: { kind, name: 'test' }, created, updated: created };
}

function question(
  id: string,
  text: string,
  created: string,
  opts: { status?: 'open' | 'done'; replies?: AnswerRecord[] } = {},
): QuestionRecord {
  return {
    id,
    kind: 'question',
    text,
    status: opts.status ?? 'open',
    replies: opts.replies ?? [],
    author: { kind: 'human', name: 'test' },
    created,
    updated: created,
  };
}

function headRow(html: string, id: string): string {
  const match = html.match(new RegExp(`<tr data-id="${id}">[\\s\\S]*?</tr>`));
  if (!match) {
    throw new Error(`head row ${id} not found in:\n${html}`);
  }
  return match[0];
}

function detailRow(html: string, id: string): string {
  const match = html.match(new RegExp(`<tr class="qa-detail" data-id="${id}"[\\s\\S]*?</tr>`));
  if (!match) {
    throw new Error(`detail row ${id} not found in:\n${html}`);
  }
  return match[0];
}

test('renderQuestions sorts open questions newest-first by created', () => {
  const html = renderQuestions([
    question('a', 'oldest', '2026-01-01T00:00:00Z'),
    question('b', 'newest', '2026-03-01T00:00:00Z'),
    question('c', 'middle', '2026-02-01T00:00:00Z'),
  ]);
  const order = [...html.matchAll(/<tr data-id="(a|b|c)">/g)].map((m) => m[1]);
  assert.deepEqual(order, ['b', 'c', 'a']);
});

test('by default, answered questions are not shown at all', () => {
  const html = renderQuestions([
    question('a', 'open one', '2026-01-01T00:00:00Z', { status: 'open' }),
    question('b', 'answered one', '2026-01-02T00:00:00Z', { status: 'done' }),
  ]);
  assert.match(html, /data-id="a"/);
  assert.doesNotMatch(html, /data-id="b"/);
  assert.doesNotMatch(html, /section-heading/);
});

test('with all:true, answered questions are grouped under an "Answered" heading below the open ones', () => {
  const html = renderQuestions(
    [
      question('a', 'open one', '2026-01-01T00:00:00Z', { status: 'open' }),
      question('b', 'answered one', '2026-01-02T00:00:00Z', { status: 'done' }),
    ],
    { all: true },
  );
  assert.match(html, /Answered \(1\)/);
  const openIndex = html.indexOf('data-id="a"');
  const headingIndex = html.indexOf('section-heading');
  const doneIndex = html.indexOf('data-id="b"');
  assert.ok(openIndex < headingIndex && headingIndex < doneIndex);
});

test('a question\'s detail row is hidden unless its id is in the expanded set', () => {
  const records = [question('a', 'some question', '2026-01-01T00:00:00Z')];
  const collapsed = detailRow(renderQuestions(records), 'a');
  assert.match(collapsed, / hidden/);

  const expanded = detailRow(renderQuestions(records, { expanded: new Set(['a']) }), 'a');
  assert.doesNotMatch(expanded, / hidden/);
});

test('the toggle button reflects expanded state via aria-expanded and its arrow, with a visible reply count', () => {
  const collapsed = headRow(
    renderQuestions([question('a', 'q', '2026-01-01T00:00:00Z', { replies: [reply('r1', 'x', '2026-01-02T00:00:00Z')] })]),
    'a',
  );
  assert.match(collapsed, /aria-expanded="false"/);
  assert.match(collapsed, />▸ Replies \(1\)</);

  const expanded = headRow(
    renderQuestions(
      [question('a', 'q', '2026-01-01T00:00:00Z', { replies: [reply('r1', 'x', '2026-01-02T00:00:00Z')] })],
      { expanded: new Set(['a']) },
    ),
    'a',
  );
  assert.match(expanded, /aria-expanded="true"/);
  assert.match(expanded, />▾ Replies \(1\)</);
});

test('a done question is checked; an open one is not', () => {
  const done = headRow(renderQuestions([question('a', 'q', '2026-01-01T00:00:00Z', { status: 'done' })], { all: true }), 'a');
  assert.match(done, /checked/);
  const open = headRow(renderQuestions([question('a', 'q', '2026-01-01T00:00:00Z', { status: 'open' })]), 'a');
  assert.doesNotMatch(open, /checked/);
});

test('replies render oldest-first with an AI/human text badge each, and the reply field is always present', () => {
  const detail = detailRow(
    renderQuestions(
      [
        question('a', 'q', '2026-01-01T00:00:00Z', {
          replies: [
            reply('r2', 'second reply', '2026-01-03T00:00:00Z', 'human'),
            reply('r1', 'first reply', '2026-01-02T00:00:00Z', 'ai'),
          ],
        }),
      ],
      { expanded: new Set(['a']) },
    ),
    'a',
  );
  const order = [...detail.matchAll(/data-id="(r1|r2)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ['r1', 'r2']);
  assert.match(detail, /badge-ai">AI</);
  assert.match(detail, /badge-human">human</);
  assert.match(detail, /data-question-id="a"/);
});

test('the exact reply text is preserved (not a substring match) and escaped', () => {
  const detail = detailRow(
    renderQuestions(
      [question('a', 'q', '2026-01-01T00:00:00Z', { replies: [reply('r1', '<b>x</b>', '2026-01-02T00:00:00Z')] })],
      { expanded: new Set(['a']) },
    ),
    'a',
  );
  assert.match(detail, /data-field="text" data-original="&lt;b&gt;x&lt;\/b&gt;"/);
  assert.doesNotMatch(detail, /<b>x<\/b>/);
});

test('the top-level add row lets a new question be typed', () => {
  const html = renderQuestions([]);
  assert.match(html, /class="add-row">/);
  assert.match(html, /data-field="text" data-original=""/);
});

test('a real question and answer added through mtqg render with the exact answer text', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const asked = await client.qaAsk('Should we cache this?');
    const answered = await client.qaAnswer(asked.data.record.id, 'Yes, in v2');
    assert.equal(answered.data.record.text, 'Yes, in v2');

    const list = await client.qaList({ all: true });
    const html = renderQuestions(list.data.records, { expanded: new Set([asked.data.record.id]) });
    assert.match(html, /Should we cache this\?/);
    assert.match(html, /Yes, in v2/);
  } finally {
    await repo.cleanup();
  }
});
