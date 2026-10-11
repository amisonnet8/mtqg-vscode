import type { RuleRecord } from '../../mtqg/types';
import { authorCell, copyIdButtonCell, dateCell, deleteButtonCell, editableCell, editableElement } from './table';

/**
 * `rule list` does not guarantee any particular order (verified against the
 * real binary: three rules added in sequence came back as third/first/second
 * -- it appears to be ID order). The oldest-first order (chat-style, the add
 * field below the list: todo `a597ec6df2`, q&a `875f5db5d2dd`) is therefore
 * built here from `created`, not inherited from mtqg's own response.
 */
export function renderRules(records: RuleRecord[]): string {
  const sorted = [...records].sort((a, b) => a.created.localeCompare(b.created));
  const rows = sorted
    .map(
      (r) =>
        `<tr data-id="${r.id}">${editableCell('text', r.text)}${authorCell(r.author)}${dateCell(r.created)}${copyIdButtonCell(r.id)}${deleteButtonCell()}</tr>`,
    )
    .join('');

  return `<table class="mtqg-table">
  <thead><tr><th>Text</th><th>Author</th><th>Date</th><th></th><th></th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="composer" data-autoscroll>
  <div class="add-row">${editableElement('div', 'text', '', 'New rule text')}</div>
</div>`;
}
