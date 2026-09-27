import type { TodoRecord } from '../../mtqg/types';
import { escapeHtml } from '../shared/escape';
import { authorText, copyIdButton, dateText, deleteButton, editableElement } from './table';

export interface TodosView {
  /** "Show done" checkbox state (ui.md: default is open-only). */
  all?: boolean;
}

/**
 * One card. Checking/unchecking the checkbox sends `setStatus` (kind
 * independent of the record's own text edits, which go through the
 * shared `editRecord` message). Done is shown with both a checked box and
 * a strikethrough on the text -- never colour alone (ui.md「色だけで意味を
 * 伝えない」).
 */
function card(record: TodoRecord): string {
  const done = record.status === 'done';
  const checkboxLabel = done ? 'Reopen' : 'Mark done';
  return `<article class="card${done ? ' done' : ''}" data-id="${record.id}">
    <label class="card-check">
      <input type="checkbox" data-action="toggle-status" aria-label="${checkboxLabel}"${done ? ' checked' : ''}>
    </label>
    ${editableElement('div', 'text', record.text)}
    <div class="card-meta">
      <span>${escapeHtml(authorText(record.author))}</span>
      <span>${escapeHtml(dateText(record.created))}</span>
    </div>
    <div class="card-actions">${copyIdButton()}${deleteButton()}</div>
  </article>`;
}

/**
 * `todo list` does not guarantee any particular order (verified against
 * the real binary, same finding as `rule list`/`glossary list` --
 * `.claude/rules/mtqg-cli.md`), so newest-first (q&a `e07736f680`, reused
 * here) is built from `created`.
 */
function sortedByCreated(records: TodoRecord[]): TodoRecord[] {
  return [...records].sort((a, b) => b.created.localeCompare(a.created));
}

/**
 * Renders the ToDo screen: an add field, a "Show done" toggle, and a grid
 * of cards. When `all` is false (the default, ui.md), only open todos are
 * shown and the toggle reflects that no done ones are hidden-but-zero vs
 * hidden-and-some -- the count is always the true total so switching the
 * toggle never looks like it did nothing.
 */
export function renderTodos(records: TodoRecord[], view: TodosView = {}): string {
  const open = sortedByCreated(records.filter((r) => r.status === 'open'));
  const done = sortedByCreated(records.filter((r) => r.status === 'done'));
  const all = view.all ?? false;

  const openCards = open.map(card).join('');
  const doneSection = all
    ? `<h3 class="done-heading">Done (${done.length})</h3><div class="mtqg-cards">${done.map(card).join('')}</div>`
    : '';

  return `<div class="screen-toolbar">
  <div class="add-row">${editableElement('div', 'text', '', 'New todo…')}</div>
  <label><input type="checkbox" data-action="show-all"${all ? ' checked' : ''}> Show done (${done.length})</label>
</div>
<div class="mtqg-cards">${openCards}</div>
${doneSection}`;
}
