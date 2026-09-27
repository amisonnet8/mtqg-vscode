import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderThread, type ThreadItem, type ThreadLabels, type ThreadReply } from '../../../../src/webview/screens/thread';

const LABELS: ThreadLabels = {
  columnHeader: 'Item',
  topPlaceholder: 'Add an item…',
  replyPlaceholder: 'Write a reply…',
  replyNounPlural: 'Replies',
  doneLabel: 'Mark done',
  showAllLabel: 'Show done',
  sectionHeading: 'Done',
};

function reply(id: string, text: string, created: string, kind: 'ai' | 'human' = 'ai'): ThreadReply {
  return { id, text, author: { kind, name: 'test' }, created };
}

function item(id: string, text: string, created: string, opts: { status?: 'open' | 'done'; replies?: ThreadReply[] } = {}): ThreadItem {
  return {
    id,
    text,
    status: opts.status ?? 'open',
    replies: opts.replies ?? [],
    author: { kind: 'human', name: 'test' },
    created,
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
  const match = html.match(new RegExp(`<tr class="thread-detail" data-id="${id}"[\\s\\S]*?</tr>`));
  if (!match) {
    throw new Error(`detail row ${id} not found in:\n${html}`);
  }
  return match[0];
}

test('renderThread sorts open items newest-first by created', () => {
  const html = renderThread(
    [item('a', 'oldest', '2026-01-01T00:00:00Z'), item('b', 'newest', '2026-03-01T00:00:00Z'), item('c', 'middle', '2026-02-01T00:00:00Z')],
    LABELS,
  );
  const order = [...html.matchAll(/<tr data-id="(a|b|c)">/g)].map((m) => m[1]);
  assert.deepEqual(order, ['b', 'c', 'a']);
});

test('by default, done items are not shown at all', () => {
  const html = renderThread(
    [item('a', 'open one', '2026-01-01T00:00:00Z', { status: 'open' }), item('b', 'done one', '2026-01-02T00:00:00Z', { status: 'done' })],
    LABELS,
  );
  assert.match(html, /data-id="a"/);
  assert.doesNotMatch(html, /data-id="b"/);
  assert.doesNotMatch(html, /section-heading/);
});

test('with all:true, done items are grouped under the section heading below the open ones', () => {
  const html = renderThread(
    [item('a', 'open one', '2026-01-01T00:00:00Z', { status: 'open' }), item('b', 'done one', '2026-01-02T00:00:00Z', { status: 'done' })],
    LABELS,
    { all: true },
  );
  assert.match(html, /Done \(1\)/);
  const openIndex = html.indexOf('data-id="a"');
  const headingIndex = html.indexOf('section-heading');
  const doneIndex = html.indexOf('data-id="b"');
  assert.ok(openIndex < headingIndex && headingIndex < doneIndex);
});

test('an item\'s detail row is hidden unless its id is in the expanded set', () => {
  const records = [item('a', 'some item', '2026-01-01T00:00:00Z')];
  const collapsed = detailRow(renderThread(records, LABELS), 'a');
  assert.match(collapsed, / hidden/);

  const expanded = detailRow(renderThread(records, LABELS, { expanded: new Set(['a']) }), 'a');
  assert.doesNotMatch(expanded, / hidden/);
});

test('the toggle button reflects expanded state via aria-expanded and its arrow, with a visible reply count using the label\'s noun', () => {
  const collapsed = headRow(renderThread([item('a', 'q', '2026-01-01T00:00:00Z', { replies: [reply('r1', 'x', '2026-01-02T00:00:00Z')] })], LABELS), 'a');
  assert.match(collapsed, /aria-expanded="false"/);
  assert.match(collapsed, />▸ Replies \(1\)</);

  const expanded = headRow(
    renderThread([item('a', 'q', '2026-01-01T00:00:00Z', { replies: [reply('r1', 'x', '2026-01-02T00:00:00Z')] })], LABELS, {
      expanded: new Set(['a']),
    }),
    'a',
  );
  assert.match(expanded, /aria-expanded="true"/);
  assert.match(expanded, />▾ Replies \(1\)</);
});

test('a done item is checked and uses "Reopen"; an open one is not checked and uses the label\'s doneLabel', () => {
  const done = headRow(renderThread([item('a', 'q', '2026-01-01T00:00:00Z', { status: 'done' })], LABELS, { all: true }), 'a');
  assert.match(done, /checked/);
  assert.match(done, /aria-label="Reopen"/);
  const open = headRow(renderThread([item('a', 'q', '2026-01-01T00:00:00Z', { status: 'open' })], LABELS), 'a');
  assert.doesNotMatch(open, /checked/);
  assert.match(open, /aria-label="Mark done"/);
});

test('replies render oldest-first with an AI/human text badge each, and the reply field is always present', () => {
  const detail = detailRow(
    renderThread(
      [
        item('a', 'q', '2026-01-01T00:00:00Z', {
          replies: [reply('r2', 'second reply', '2026-01-03T00:00:00Z', 'human'), reply('r1', 'first reply', '2026-01-02T00:00:00Z', 'ai')],
        }),
      ],
      LABELS,
      { expanded: new Set(['a']) },
    ),
    'a',
  );
  const order = [...detail.matchAll(/data-id="(r1|r2)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ['r1', 'r2']);
  assert.match(detail, /badge-ai">AI</);
  assert.match(detail, /badge-human">human</);
  assert.match(detail, /data-parent-id="a"/);
  assert.match(detail, /aria-label="Write a reply…"/);
});

test('the exact reply text is preserved (not a substring match) and escaped', () => {
  const detail = detailRow(
    renderThread([item('a', 'q', '2026-01-01T00:00:00Z', { replies: [reply('r1', '<b>x</b>', '2026-01-02T00:00:00Z')] })], LABELS, {
      expanded: new Set(['a']),
    }),
    'a',
  );
  assert.match(detail, /data-field="text" data-original="&lt;b&gt;x&lt;\/b&gt;"/);
  assert.doesNotMatch(detail, /<b>x<\/b>/);
});

test('the top-level add row uses the label\'s placeholder and the column header uses the label\'s noun', () => {
  const html = renderThread([], LABELS);
  assert.match(html, /class="add-row">/);
  assert.match(html, /aria-label="Add an item…"/);
  assert.match(html, /<th>Item<\/th>/);
});

test('an item\'s head row and each of its replies carry a Copy ID button', () => {
  const html = renderThread([item('a', 'text', '2026-01-01T00:00:00Z', { replies: [reply('r1', 'a reply', '2026-01-02T00:00:00Z')] })], LABELS, {
    expanded: new Set(['a']),
  });
  assert.match(headRow(html, 'a'), /data-action="copy-id"/);
  assert.match(detailRow(html, 'a'), /data-action="copy-id"/);
});
