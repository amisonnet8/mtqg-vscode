import type { Author, JournalEvent, MtqgRecord, RecordState } from '../../mtqg/types';
import { escapeHtml } from '../shared/escape';
import { replyRow, type ThreadReply } from './thread';
import { authorText, badge, dateText, deleteButton, editableElement } from './table';

/** One `log --events` entry: any mtqg record, plus its own event history
 * (used only to tell "edited" apart -- ui.md「訂正の事実を追記し、直したことを
 * 見せる」). `log` never returns a deleted record, even with `--events`
 * (verified against the real binary, todo `01ee2706ce`): ui.md's "消すと跡が
 * 残る" cannot be built for this screen with the CLI as it stands today
 * (q&a `a7a84c6cf072`), so a delete here behaves like every other screen --
 * the post disappears, leaving no placeholder. */
export type MemoRecord = MtqgRecord & { events?: JournalEvent[] };

export interface MemosView {
  /** Whether `log`'s `total` exceeds what was fetched (todo `01ee2706ce`:
   * this screen re-fetches with a growing `--limit` rather than paging with
   * `--before`, so a write to an already-loaded record can never go stale
   * behind a page boundary). */
  hasEarlier?: boolean;
  /** A one-line result from the last `compose` parse error or `undo`
   * (q&a `ae6550d6f3c2`), replaced by the next one. */
  notice?: string;
  /** Scroll the timeline to its newest post after this render. False after
   * "Load earlier" so the newly-prepended older posts do not get scrolled
   * away immediately. */
  autoscroll?: boolean;
}

function isEdited(record: MemoRecord): boolean {
  return (record.events ?? []).some((event) => event.op === 'edit');
}

function metaLine(author: Author, created: string, edited: boolean): string {
  const isAi = author.kind === 'ai';
  const editedMark = edited ? ' <span class="post-edited">(edited)</span>' : '';
  return `<span class="post-meta">${badge(isAi ? 'AI' : 'human', isAi ? 'badge-ai' : 'badge-human')} ${escapeHtml(
    authorText(author),
  )} · ${escapeHtml(dateText(created))}${editedMark}</span>`;
}

function postShell(id: string, extraClass: string, body: string): string {
  return `<article class="post ${extraClass}" data-id="${id}">${body}${deleteButton()}</article>`;
}

function memoPost(record: MemoRecord & { kind: 'memo' }): string {
  return postShell(
    record.id,
    'post-memo',
    `${editableElement('div', 'text', record.text)}${metaLine(record.author, record.created, isEdited(record))}`,
  );
}

function todoPost(record: MemoRecord & { kind: 'todo' }): string {
  const done = record.status === 'done';
  return postShell(
    record.id,
    `post-todo${done ? ' done' : ''}`,
    `<label class="post-check"><input type="checkbox" data-action="toggle-status" data-kind="todo" aria-label="${
      done ? 'Reopen' : 'Mark done'
    }"${done ? ' checked' : ''}></label>${editableElement('span', 'text', record.text)}${metaLine(
      record.author,
      record.created,
      isEdited(record),
    )}`,
  );
}

interface ThreadPostOptions {
  kind: 'question' | 'bug';
  doneLabel: string;
}

/** A question/bug post, with any of its loaded answers/replies threaded
 * beneath it (ui.md「質問への返信がスレッドにぶら下がる」) -- reuses
 * `screens/thread.ts`'s `replyRow`, the same markup QA/Bugs already show. */
function threadPost(
  record: MemoRecord & { id: string; text: string; status: RecordState; author: Author; created: string },
  replies: ThreadReply[],
  options: ThreadPostOptions,
): string {
  const done = record.status === 'done';
  const sortedReplies = [...replies].sort((a, b) => a.created.localeCompare(b.created));
  const replyList = sortedReplies.length ? `<div class="thread-list">${sortedReplies.map(replyRow).join('')}</div>` : '';
  return postShell(
    record.id,
    `post-thread${done ? ' done' : ''}`,
    `<label class="post-check"><input type="checkbox" data-action="toggle-status" data-kind="${options.kind}" aria-label="${
      done ? 'Reopen' : options.doneLabel
    }"${done ? ' checked' : ''}></label>${editableElement('span', 'text', record.text)}${metaLine(
      record.author,
      record.created,
      isEdited(record),
    )}${replyList}`,
  );
}

/** An answer/reply whose question/bug fell outside the currently loaded
 * window -- shown on its own, labelled with what it is a reply to (ui.md's
 * term pairing, naming.md: question/answer, bug/reply). */
function standaloneReplyPost(record: MemoRecord & { kind: 'answer' | 'reply' }): string {
  const label = record.kind === 'answer' ? 'Answered a question' : 'Replied to a bug';
  return postShell(
    record.id,
    'post-reply-standalone',
    `<span class="post-action">${escapeHtml(label)}</span>${editableElement('span', 'text', record.text)}${metaLine(
      record.author,
      record.created,
      isEdited(record),
    )}`,
  );
}

function glossaryPost(record: MemoRecord & { kind: 'glossary' }): string {
  return postShell(
    record.id,
    'post-glossary',
    `<span class="post-action">Defined a term</span> <strong>${escapeHtml(record.word)}</strong>${editableElement(
      'span',
      'text',
      record.text,
    )}${metaLine(record.author, record.created, isEdited(record))}`,
  );
}

function rulePost(record: MemoRecord & { kind: 'rule' }): string {
  return postShell(
    record.id,
    'post-rule',
    `<span class="post-action">Adopted a rule</span>${editableElement('span', 'text', record.text)}${metaLine(
      record.author,
      record.created,
      isEdited(record),
    )}`,
  );
}

function post(record: MemoRecord, repliesByParent: Map<string, MemoRecord[]>): string {
  switch (record.kind) {
    case 'memo':
      return memoPost(record);
    case 'todo':
      return todoPost(record);
    case 'question':
      return threadPost(record, repliesByParent.get(record.id) ?? [], { kind: 'question', doneLabel: 'Mark answered' });
    case 'bug':
      return threadPost(record, repliesByParent.get(record.id) ?? [], { kind: 'bug', doneLabel: 'Mark closed' });
    case 'glossary':
      return glossaryPost(record);
    case 'rule':
      return rulePost(record);
    case 'answer':
    case 'reply':
      return standaloneReplyPost(record);
  }
}

/**
 * Renders the Memo screen: a "Load earlier" button (only when there is
 * more), the timeline itself (oldest first -- `log` returns newest-first,
 * ui.md「新しい発言は下」), and the composer + Undo button.
 *
 * `records` is expected to come from `log({ events: true })`. An
 * answer/reply is threaded under its question/bug when that parent is also
 * in `records`; otherwise it stands alone (see `standaloneReplyPost`).
 */
export function renderMemos(records: MemoRecord[], view: MemosView = {}): string {
  const chronological = [...records].reverse();
  const ids = new Set(chronological.map((r) => r.id));
  const repliesByParent = new Map<string, MemoRecord[]>();
  const mainline: MemoRecord[] = [];

  for (const record of chronological) {
    if ((record.kind === 'answer' || record.kind === 'reply') && ids.has(record.re)) {
      const list = repliesByParent.get(record.re) ?? [];
      list.push(record);
      repliesByParent.set(record.re, list);
      continue;
    }
    mainline.push(record);
  }

  const posts = mainline.map((r) => post(r, repliesByParent)).join('');
  const loadEarlierButton = view.hasEarlier
    ? '<button type="button" class="load-earlier" data-action="load-earlier">Load earlier</button>'
    : '';
  const noticeLine = view.notice ? `<p class="notice" role="status">${escapeHtml(view.notice)}</p>` : '';
  const autoscrollAttr = view.autoscroll === false ? '' : ' data-autoscroll';

  return `${loadEarlierButton}
<div class="timeline">${posts}</div>
${noticeLine}
<div class="composer"${autoscrollAttr}>
  <div class="add-row">${editableElement('div', 'text', '', 'Write a memo… (/todo /qa /bug /rule /glossary)')}</div>
  <button type="button" data-action="undo">Undo</button>
</div>`;
}
