import type { AnswerRecord, QuestionRecord } from '../../mtqg/types';
import { escapeHtml } from '../shared/escape';
import { authorCell, authorText, badge, dateCell, dateText, deleteButton, deleteButtonCell, editableCell, editableElement } from './table';

export interface QuestionsView {
  /** "Show answered" checkbox state (ui.md: default is unanswered-only). */
  all?: boolean;
  /** IDs of questions currently expanded (todo `8b7b600827`: kept by the
   * controller, not mtqg -- a display state, not a record). */
  expanded?: Set<string>;
}

function sortedByCreated<T extends { created: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => b.created.localeCompare(a.created));
}

/**
 * One reply, in its own id-bearing container so the Webview's generic
 * edit/delete handling (src/webview/client/main.ts, `closest('[data-id]')`)
 * targets the reply itself, not the question it answers.
 */
function replyRow(reply: AnswerRecord): string {
  const isAi = reply.author.kind === 'ai';
  return `<div class="qa-reply" data-id="${reply.id}">
      ${badge(isAi ? 'AI' : 'human', isAi ? 'badge-ai' : 'badge-human')}
      ${editableElement('span', 'text', reply.text)}
      <span class="qa-reply-meta">${escapeHtml(authorText(reply.author))} · ${escapeHtml(dateText(reply.created))}</span>
      ${deleteButton()}
    </div>`;
}

/**
 * A question renders as two `<tr>`s: the summary row (status, text, author,
 * date, delete -- same shape as Rules/Glossary's rows) and a detail row
 * holding the reply thread plus an always-present reply field (q&a
 * `e4eddd6e3628`: replies can be added even to an already-answered
 * question, mirroring mtqg's own `replies` array). `qa list` already
 * includes `replies` (verified against the real binary), so expanding
 * never needs a separate `show` call -- it only toggles what this render
 * already has.
 */
function questionRows(record: QuestionRecord, expanded: boolean): string {
  const done = record.status === 'done';
  const replies = [...(record.replies ?? [])].sort((a, b) => a.created.localeCompare(b.created));

  // A visible "Replies (n)" label, not just the ▸/▾ glyph: a human tester
  // found the icon-only button too subtle to notice (todo `8b7b600827`,
  // q&a `3d439aabe9e3`) -- the count also tells you there is something to
  // open before you click.
  const headRow = `<tr data-id="${record.id}">
    <td><button type="button" class="toggle-expand" data-action="toggle-expand" aria-expanded="${expanded}">${expanded ? '▾' : '▸'} Replies (${replies.length})</button></td>
    <td><input type="checkbox" data-action="toggle-status" aria-label="${done ? 'Reopen' : 'Mark answered'}"${done ? ' checked' : ''}></td>
    ${editableCell('text', record.text)}
    ${authorCell(record.author)}
    ${dateCell(record.created)}
    ${deleteButtonCell()}
  </tr>`;

  const detailRow = `<tr class="qa-detail" data-id="${record.id}"${expanded ? '' : ' hidden'}>
    <td colspan="6">
      <div class="qa-thread">${replies.map(replyRow).join('')}</div>
      <div class="add-row" data-question-id="${record.id}">${editableElement('div', 'text', '', 'Write a reply…')}</div>
    </td>
  </tr>`;

  return headRow + detailRow;
}

/**
 * `qa list` does not guarantee any particular order (same finding as
 * `rule list`/`glossary list`/`todo list` -- `.claude/rules/mtqg-cli.md`),
 * so newest-first is built here from `created`, same as the other screens.
 * Answered questions, when shown, are grouped below an "Answered" heading,
 * mirroring ToDo's "Done" section (todo `4e09f42a9f`) for the same toggle.
 */
export function renderQuestions(records: QuestionRecord[], view: QuestionsView = {}): string {
  const all = view.all ?? false;
  const expanded = view.expanded ?? new Set<string>();
  const open = sortedByCreated(records.filter((r) => r.status === 'open'));
  const done = sortedByCreated(records.filter((r) => r.status === 'done'));

  const openRows = open.map((r) => questionRows(r, expanded.has(r.id))).join('');
  const doneRows = all
    ? `<tr class="section-heading"><td colspan="6">Answered (${done.length})</td></tr>${done
        .map((r) => questionRows(r, expanded.has(r.id)))
        .join('')}`
    : '';

  return `<div class="screen-toolbar">
  <div class="add-row">${editableElement('div', 'text', '', 'Ask a question…')}</div>
  <label><input type="checkbox" data-action="show-all"${all ? ' checked' : ''}> Show answered (${done.length})</label>
</div>
<table class="mtqg-table">
  <thead><tr><th></th><th></th><th>Question</th><th>Author</th><th>Date</th><th></th></tr></thead>
  <tbody>${openRows}${doneRows}</tbody>
</table>`;
}
