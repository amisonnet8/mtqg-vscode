import type { Author, JournalEvent, MtqgRecord, RecordState } from '../../mtqg/types';
import { escapeHtml } from '../shared/escape';
import { replyRow } from './thread';
import { authorText, badge, dateText, deleteButton, editableElement } from './table';

/** One `log --events` entry: any mtqg record, plus its own event history
 * (used to tell "edited" apart -- ui.md「訂正の事実を追記し、直したことを見せる」
 * -- and, since mtqg v0.4.0, to tell "deleted" apart too). `--events` is the
 * only mode where `log` returns deleted records at all (verified against the
 * real binary, todo `01ee2706ce` follow-up): a record that was deleted has
 * `deleted: true` and an `op:"delete"` event of its own; a record whose
 * *parent* question/bug was deleted (so it is hidden along with it) also has
 * `deleted: true`, but no `delete` event of its own -- it was never deleted,
 * only hidden. Living records have no `deleted` field at all. */
export type MemoRecord = MtqgRecord & { events?: JournalEvent[]; deleted?: boolean };

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

/** The record's own `delete` event, if it was deleted directly (as opposed
 * to only being hidden because its parent question/bug was deleted --
 * `record.deleted` is true in both cases, but only a direct delete has this). */
function ownDeleteEvent(record: MemoRecord): JournalEvent | undefined {
  return (record.events ?? []).find((event) => event.op === 'delete');
}

/** `verb` swaps the plain date for "<verb> <date>" (used for the deleted-post
 * meta line, e.g. "deleted Sep 27, 2026, 12:03", so it reads as when/who
 * deleted it rather than when it was created). */
function metaLine(author: Author, timestamp: string, edited: boolean, verb?: string): string {
  const isAi = author.kind === 'ai';
  const editedMark = edited ? ' <span class="post-edited">(edited)</span>' : '';
  const dateLabel = verb ? `${verb} ${dateText(timestamp)}` : dateText(timestamp);
  return `<span class="post-meta">${badge(isAi ? 'AI' : 'human', isAi ? 'badge-ai' : 'badge-human')} ${escapeHtml(
    authorText(author),
  )} · ${escapeHtml(dateLabel)}${editedMark}</span>`;
}

/** Every kind's "Deleted a/an <noun>" wording (naming.md's question/answer,
 * bug/reply pairing; glossary's noun is "term" to match "Defined a term"). */
const DELETED_LABELS: Record<MemoRecord['kind'], string> = {
  memo: 'Deleted a memo',
  todo: 'Deleted a todo',
  question: 'Deleted a question',
  answer: 'Deleted an answer',
  bug: 'Deleted a bug',
  reply: 'Deleted a reply',
  glossary: 'Deleted a term',
  rule: 'Deleted a rule',
};

/** A question/bug's answers/replies that were hidden along with it (not
 * deleted themselves) are summarized as a count, never shown individually --
 * q&a `c379a8d90bb9`. */
const HIDDEN_COUNT_NOUN: Record<'question' | 'bug', 'answer' | 'reply'> = {
  question: 'answer',
  bug: 'reply',
};

function describeHiddenCount(count: number, kind: 'question' | 'bug'): string {
  const noun = HIDDEN_COUNT_NOUN[kind];
  return `${count} ${noun}${count === 1 ? '' : 's'} hidden with it`;
}

/**
 * The "跡" (trace) a delete leaves in the timeline (q&a `36a56edded8e`): the
 * body is replaced entirely -- never shown, since mtqg no longer serves it --
 * by a plain "Deleted a memo" style line, plus who deleted it and when (from
 * the record's own `delete` event, if it has one -- a record only hidden
 * because its *parent* was deleted has no `delete` event of its own, and its
 * label reflects that instead; see `hiddenReplyPost`). No checkbox, no edit,
 * no delete button: mtqg no longer accepts any operation on a deleted (or
 * hidden) record (`not_found`, verified against the real binary).
 */
function deletedPost(record: MemoRecord, hiddenCount?: number): string {
  const deleteEvent = ownDeleteEvent(record);
  const meta = deleteEvent ? metaLine(deleteEvent.author, deleteEvent.ts, false, 'deleted') : '';
  const hiddenLine =
    hiddenCount && (record.kind === 'question' || record.kind === 'bug')
      ? `<p class="post-hidden-count">${escapeHtml(describeHiddenCount(hiddenCount, record.kind))}</p>`
      : '';
  return `<article class="post post-deleted" data-id="${record.id}"><span class="post-action">${
    DELETED_LABELS[record.kind]
  }</span>${meta}${hiddenLine}</article>`;
}

/** An answer/reply hidden because its own question/bug was deleted, shown on
 * its own because that parent fell outside the currently loaded window (so
 * there is nowhere to attach a hidden-count to instead; compare the
 * in-window case in `renderMemos`, which counts these instead of rendering
 * them). */
function hiddenReplyPost(record: MemoRecord & { kind: 'answer' | 'reply' }): string {
  const label = record.kind === 'answer' ? 'Hidden with its deleted question' : 'Hidden with its deleted bug';
  return `<article class="post post-deleted" data-id="${record.id}"><span class="post-action">${label}</span>${metaLine(
    record.author,
    record.created,
    false,
  )}</article>`;
}

/** A reply row for an answer/reply that was deleted directly while its
 * question/bug stayed alive -- same trace treatment as `deletedPost`, but
 * shaped as a thread row (`thread.ts`'s `.thread-reply`) instead of a
 * top-level post. */
function deletedReplyRow(record: MemoRecord & { kind: 'answer' | 'reply' }): string {
  const deleteEvent = ownDeleteEvent(record);
  const meta = deleteEvent ? metaLine(deleteEvent.author, deleteEvent.ts, false, 'deleted') : '';
  return `<div class="thread-reply post-deleted" data-id="${record.id}"><span class="post-action">${
    DELETED_LABELS[record.kind]
  }</span>${meta}</div>`;
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
 * `screens/thread.ts`'s `replyRow` for live replies, the same markup QA/Bugs
 * already show. A reply deleted directly (parent still alive) gets a
 * `deletedReplyRow` in its place instead of disappearing; replies hidden
 * because *this* record was deleted are never passed in here at all --
 * `renderMemos` counts them into `hiddenCount` instead (q&a `c379a8d90bb9`). */
function threadPost(
  record: MemoRecord & { id: string; text: string; status: RecordState; author: Author; created: string },
  replies: (MemoRecord & { kind: 'answer' | 'reply' })[],
  hiddenCount: number,
  options: ThreadPostOptions,
): string {
  const done = record.status === 'done';
  const sortedReplies = [...replies].sort((a, b) => a.created.localeCompare(b.created));
  const rows = sortedReplies.map((r) => (r.deleted ? deletedReplyRow(r) : replyRow(r))).join('');
  const hiddenLine = hiddenCount
    ? `<p class="post-hidden-count">${escapeHtml(describeHiddenCount(hiddenCount, options.kind))}</p>`
    : '';
  const replyList = rows || hiddenLine ? `<div class="thread-list">${rows}</div>${hiddenLine}` : '';
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
 * term pairing, naming.md: question/answer, bug/reply). Deleted or hidden
 * ones get their own trace treatment instead of the normal "Answered a
 * question" wording. */
function standaloneReplyPost(record: MemoRecord & { kind: 'answer' | 'reply' }): string {
  if (record.deleted) {
    return ownDeleteEvent(record) ? deletedPost(record) : hiddenReplyPost(record);
  }
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

function post(
  record: MemoRecord,
  repliesByParent: Map<string, (MemoRecord & { kind: 'answer' | 'reply' })[]>,
  hiddenCountByParent: Map<string, number>,
): string {
  // A deleted memo/todo/question/bug/glossary/rule leaves a trace, same
  // treatment for every kind (q&a `36a56edded8e`). Answer/reply have two
  // distinct "gone" states (deleted directly vs. hidden by a deleted
  // parent), handled inside `standaloneReplyPost` instead.
  if (record.deleted && record.kind !== 'answer' && record.kind !== 'reply') {
    return deletedPost(record, hiddenCountByParent.get(record.id));
  }
  switch (record.kind) {
    case 'memo':
      return memoPost(record);
    case 'todo':
      return todoPost(record);
    case 'question':
      return threadPost(record, repliesByParent.get(record.id) ?? [], hiddenCountByParent.get(record.id) ?? 0, {
        kind: 'question',
        doneLabel: 'Mark answered',
      });
    case 'bug':
      return threadPost(record, repliesByParent.get(record.id) ?? [], hiddenCountByParent.get(record.id) ?? 0, {
        kind: 'bug',
        doneLabel: 'Mark closed',
      });
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
 * `records` is expected to come from `log({ events: true })`, which since
 * mtqg v0.4.0 also includes deleted and parent-deleted-hidden records
 * (`deleted: true`) -- rendered as a trace rather than dropped, per ui.md's
 * "消すと跡が残る". An answer/reply is threaded under its question/bug when
 * that parent is also in `records`; otherwise it stands alone (see
 * `standaloneReplyPost`).
 */
export function renderMemos(records: MemoRecord[], view: MemosView = {}): string {
  const chronological = [...records].reverse();
  const ids = new Set(chronological.map((r) => r.id));
  // Parents (question/bug) that will themselves render as a trace
  // (`deletedPost`, never `threadPost`) -- found up front because *any* of
  // their answers/replies, whether individually deleted before the parent
  // was or only hidden once the parent was, must fold into that parent's
  // single hidden-count instead of being looked for inside a thread that
  // will never render (real-device check, todo `01ee2706ce` follow-up:
  // without this, an answer deleted before its question just vanished --
  // neither counted nor shown -- once the question was deleted too).
  const deletedParentIds = new Set(chronological.filter((r) => r.deleted && ownDeleteEvent(r)).map((r) => r.id));
  const repliesByParent = new Map<string, (MemoRecord & { kind: 'answer' | 'reply' })[]>();
  const hiddenCountByParent = new Map<string, number>();
  const mainline: MemoRecord[] = [];

  for (const record of chronological) {
    if ((record.kind === 'answer' || record.kind === 'reply') && ids.has(record.re)) {
      // Folded into the parent's count instead of rendered on its own,
      // either because the parent itself is now a trace (see above) or
      // because only this reply was hidden along with a still-alive parent
      // being deleted (no `delete` event of its own -- q&a `c379a8d90bb9`).
      if (deletedParentIds.has(record.re) || (record.deleted && !ownDeleteEvent(record))) {
        hiddenCountByParent.set(record.re, (hiddenCountByParent.get(record.re) ?? 0) + 1);
        continue;
      }
      const list = repliesByParent.get(record.re) ?? [];
      list.push(record);
      repliesByParent.set(record.re, list);
      continue;
    }
    mainline.push(record);
  }

  const posts = mainline.map((r) => post(r, repliesByParent, hiddenCountByParent)).join('');
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
