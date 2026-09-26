import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMtqgClient } from '../../../../src/mtqg/client';
import { renderBugs } from '../../../../src/webview/screens/bugs';
import { createTempRepo } from '../../../helpers/tempRepo';

/**
 * Generic thread behaviour is covered once for both QA and Bugs in
 * test/unit/webview/screens/thread.test.ts (todo `13570d152b`「QA画面の部品
 * を使い回す」). This file only checks that renderBugs plugs in Bugs' own
 * wording -- naming.md's bug/reply pair, not question/answer.
 */
test('renderBugs uses Bugs wording: "Bug" column, "Replies" noun, "closed" labels', () => {
  const html = renderBugs([]);
  assert.match(html, /<th>Bug<\/th>/);
  assert.match(html, /aria-label="Report a bug…"/);
  assert.match(html, /Show closed \(0\)/);
});

test('renderBugs labels the reply field and toggle with "Replies", not "Answers"', () => {
  const html = renderBugs([
    { id: 'a', kind: 'bug', text: 'crashes', status: 'open', author: { kind: 'human', name: 'test' }, created: '2026-01-01T00:00:00Z', updated: '2026-01-01T00:00:00Z', replies: [] },
  ]);
  assert.match(html, />▸ Replies \(0\)</);
  assert.doesNotMatch(html, /Answers/);
});

test('renderBugs groups closed bugs under "Closed"', () => {
  const html = renderBugs(
    [
      { id: 'a', kind: 'bug', text: 'crashes', status: 'done', author: { kind: 'human', name: 'test' }, created: '2026-01-01T00:00:00Z', updated: '2026-01-01T00:00:00Z', replies: [] },
    ],
    { all: true },
  );
  assert.match(html, /Closed \(1\)/);
});

test('renderBugs labels the status checkbox "Mark closed" for an open bug', () => {
  const html = renderBugs([
    { id: 'a', kind: 'bug', text: 'crashes', status: 'open', author: { kind: 'human', name: 'test' }, created: '2026-01-01T00:00:00Z', updated: '2026-01-01T00:00:00Z', replies: [] },
  ]);
  assert.match(html, /aria-label="Mark closed"/);
});

test('a real bug and reply added through mtqg render with the exact reply text', async () => {
  const repo = await createTempRepo();
  try {
    const client = createMtqgClient(repo.root);
    const bug = await client.bugReport('crashes on empty input');
    const reply = await client.bugReply(bug.data.record.id, 'reproduced on macOS too');
    assert.equal(reply.data.record.text, 'reproduced on macOS too');

    const list = await client.bugList({ all: true });
    const html = renderBugs(list.data.records, { expanded: new Set([bug.data.record.id]) });
    assert.match(html, /crashes on empty input/);
    assert.match(html, /reproduced on macOS too/);
  } finally {
    await repo.cleanup();
  }
});
