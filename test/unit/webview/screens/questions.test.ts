import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMtqgClient } from '../../../../src/mtqg/client';
import { renderQuestions } from '../../../../src/webview/screens/questions';
import { createTempRepo } from '../../../helpers/tempRepo';

/**
 * Generic thread behaviour (sorting, expand/collapse, done grouping, AI/
 * human badges, exact-text handling) is covered once for both QA and Bugs
 * in test/unit/webview/screens/thread.test.ts. This file only checks that
 * renderQuestions plugs in QA's own wording -- naming.md's question/answer
 * pair, not bug/reply (bug `48b5d29d54a3`).
 */
test('renderQuestions uses QA wording: "Question" column, "Answers" noun, "answered" labels', () => {
  const html = renderQuestions([]);
  assert.match(html, /<th>Question<\/th>/);
  assert.match(html, /aria-label="Ask a question…"/);
  assert.match(html, /Show answered \(0\)/);
});

test('renderQuestions labels the reply field and toggle with "Answers", not "Replies"', () => {
  const html = renderQuestions([{ id: 'a', kind: 'question', text: 'q', status: 'open', author: { kind: 'human', name: 'test' }, created: '2026-01-01T00:00:00Z', updated: '2026-01-01T00:00:00Z', replies: [] }]);
  assert.match(html, />▸ Answers \(0\)</);
  assert.doesNotMatch(html, /Replies/);
});

test('renderQuestions groups answered questions under "Answered"', () => {
  const html = renderQuestions(
    [{ id: 'a', kind: 'question', text: 'q', status: 'done', author: { kind: 'human', name: 'test' }, created: '2026-01-01T00:00:00Z', updated: '2026-01-01T00:00:00Z', replies: [] }],
    { all: true },
  );
  assert.match(html, /Answered \(1\)/);
});

test('renderQuestions labels the status checkbox "Mark answered" for an open question', () => {
  const html = renderQuestions([{ id: 'a', kind: 'question', text: 'q', status: 'open', author: { kind: 'human', name: 'test' }, created: '2026-01-01T00:00:00Z', updated: '2026-01-01T00:00:00Z', replies: [] }]);
  assert.match(html, /aria-label="Mark answered"/);
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
