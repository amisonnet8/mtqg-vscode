import type { Author, RecordState } from '../../mtqg/types';
import { escapeHtml } from '../shared/escape';
import {
  authorCell,
  authorText,
  badge,
  copyIdButton,
  copyIdButtonCell,
  dateCell,
  dateSpan,
  deleteButton,
  deleteButtonCell,
  editableCell,
  editableElement,
} from './table';

/**
 * QA and Bugs share one shape (ui.md「Bugsは QAと同じ形」, todo
 * `13570d152b`「QA画面の部品を使い回す」): a table where each item expands
 * in place into a reply thread plus an always-present reply field. Both
 * `QuestionRecord`/`BugRecord` and `AnswerRecord`/`ReplyRecord` are
 * structurally assignable to these (extra fields like `kind` are fine for
 * a non-literal argument), so this module names no mtqg kind and can be
 * shared as-is rather than duplicated per screen.
 */
export interface ThreadItem {
  id: string;
  text: string;
  status: RecordState;
  author: Author;
  created: string;
  replies?: ThreadReply[];
}

export interface ThreadReply {
  id: string;
  text: string;
  author: Author;
  created: string;
}

/**
 * Every piece of screen-specific wording. naming.md's term table pairs
 * question/answer and bug/reply -- these must not be mixed (bug
 * `48b5d29d54a3`: QA's reply field was first built saying "reply", which is
 * the Bugs term, not QA's "answer").
 */
export interface ThreadLabels {
  /** The item column's header, e.g. 'Question' | 'Bug'. */
  columnHeader: string;
  /** The top-of-screen add field's placeholder, e.g. 'Ask a question…' | 'Report a bug…'. */
  topPlaceholder: string;
  /** The always-present reply field's placeholder, e.g. 'Write an answer…' | 'Write a reply…'. */
  replyPlaceholder: string;
  /** The reply-count label on the expand button, e.g. 'Answers' | 'Replies'. */
  replyNounPlural: string;
  /** The status checkbox's label when unchecked, e.g. 'Mark answered' | 'Mark closed'. */
  doneLabel: string;
  /** The "show done" toggle's label, e.g. 'Show answered' | 'Show closed'. */
  showAllLabel: string;
  /** The heading above done items, e.g. 'Answered' | 'Closed'. */
  sectionHeading: string;
}

export interface ThreadView {
  /** "Show done"-style checkbox state (ui.md: default is open-only). */
  all?: boolean;
  /** IDs of items currently expanded (todo `8b7b600827`: kept by the
   * controller, not mtqg -- a display state, not a record). */
  expanded?: Set<string>;
}

function sortedByCreated<T extends { created: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => b.created.localeCompare(a.created));
}

/**
 * One reply, in its own id-bearing container so the Webview's generic
 * edit/delete handling (src/webview/client/main.ts, `closest('[data-id]')`)
 * targets the reply itself, not the item it answers.
 */
export function replyRow(reply: ThreadReply): string {
  const isAi = reply.author.kind === 'ai';
  return `<div class="thread-reply" data-id="${reply.id}">
      ${badge(isAi ? 'AI' : 'human', isAi ? 'badge-ai' : 'badge-human')}
      ${editableElement('span', 'text', reply.text)}
      <span class="thread-reply-meta">${escapeHtml(authorText(reply.author))} · ${dateSpan(reply.created)}</span>
      ${copyIdButton()}
      ${deleteButton()}
    </div>`;
}

/**
 * An item renders as two `<tr>`s: the summary row (status, text, author,
 * date, delete -- same shape as Rules/Glossary's rows) and a detail row
 * holding the reply thread plus an always-present reply field (q&a
 * `e4eddd6e3628`: replies can be added even to an already-closed/answered
 * item, mirroring mtqg's own `replies` array). `qa list`/`bug list` already
 * include `replies` (verified against the real binary), so expanding never
 * needs a separate `show` call -- it only toggles what this render already
 * has.
 */
function itemRows(record: ThreadItem, expanded: boolean, labels: ThreadLabels): string {
  const done = record.status === 'done';
  const replies = [...(record.replies ?? [])].sort((a, b) => a.created.localeCompare(b.created));

  // A visible "<Noun> (n)" label, not just the ▸/▾ glyph: a human tester
  // found the icon-only button too subtle to notice (todo `8b7b600827`,
  // q&a `3d439aabe9e3`) -- the count also tells you there is something to
  // open before you click.
  const headRow = `<tr data-id="${record.id}">
    <td><button type="button" class="toggle-expand" data-action="toggle-expand" aria-expanded="${expanded}">${expanded ? '▾' : '▸'} ${labels.replyNounPlural} (${replies.length})</button></td>
    <td><input type="checkbox" data-action="toggle-status" aria-label="${done ? 'Reopen' : labels.doneLabel}"${done ? ' checked' : ''}></td>
    ${editableCell('text', record.text)}
    ${authorCell(record.author)}
    ${dateCell(record.created)}
    ${copyIdButtonCell()}
    ${deleteButtonCell()}
  </tr>`;

  const detailRow = `<tr class="thread-detail" data-id="${record.id}"${expanded ? '' : ' hidden'}>
    <td colspan="7">
      <div class="thread-list">${replies.map(replyRow).join('')}</div>
      <div class="add-row" data-parent-id="${record.id}">${editableElement('div', 'text', '', labels.replyPlaceholder)}</div>
    </td>
  </tr>`;

  return headRow + detailRow;
}

/**
 * `qa list`/`bug list` do not guarantee any particular order (same finding
 * as `rule list`/`glossary list`/`todo list` -- `.claude/rules/mtqg-cli.md`),
 * so newest-first is built here from `created`, same as the other screens.
 * Done items, when shown, are grouped below a heading, mirroring ToDo's
 * "Done" section (todo `4e09f42a9f`) for the same toggle.
 */
export function renderThread(records: ThreadItem[], labels: ThreadLabels, view: ThreadView = {}): string {
  const all = view.all ?? false;
  const expanded = view.expanded ?? new Set<string>();
  const open = sortedByCreated(records.filter((r) => r.status === 'open'));
  const done = sortedByCreated(records.filter((r) => r.status === 'done'));

  const openRows = open.map((r) => itemRows(r, expanded.has(r.id), labels)).join('');
  const doneRows = all
    ? `<tr class="section-heading"><td colspan="7">${labels.sectionHeading} (${done.length})</td></tr>${done
        .map((r) => itemRows(r, expanded.has(r.id), labels))
        .join('')}`
    : '';

  return `<div class="screen-toolbar">
  <div class="add-row">${editableElement('div', 'text', '', labels.topPlaceholder)}</div>
  <label><input type="checkbox" data-action="show-all"${all ? ' checked' : ''}> ${labels.showAllLabel} (${done.length})</label>
</div>
<table class="mtqg-table">
  <thead><tr><th></th><th></th><th>${labels.columnHeader}</th><th>Author</th><th>Date</th><th></th><th></th></tr></thead>
  <tbody>${openRows}${doneRows}</tbody>
</table>`;
}
