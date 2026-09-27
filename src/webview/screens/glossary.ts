import type { GlossaryRecord } from '../../mtqg/types';
import { escapeHtml } from '../shared/escape';
import { authorCell, copyIdButtonCell, dateCell, deleteButtonCell, editableCell } from './table';

/**
 * `edit` can change a glossary entry's definition but never its word
 * (docs/reference/cli.md「edit, delete」: "The word of a glossary entry
 * cannot [change]"), so unlike `renderRules`, only the definition column is
 * `editableCell` on an existing row -- the word is editable only on the add
 * row, where it is still being created.
 *
 * Same-word entries are flagged with a badge, not sorted next to each other:
 * the human chose newest-first order for this screen over grouping by word
 * (q&a `e07736f680`), so "並べて目立たせる" (ui.md) is done visually instead.
 */
export function renderGlossary(records: GlossaryRecord[]): string {
  const sorted = [...records].sort((a, b) => b.created.localeCompare(a.created));
  const wordCounts = new Map<string, number>();
  for (const record of sorted) {
    wordCounts.set(record.word, (wordCounts.get(record.word) ?? 0) + 1);
  }

  const rows = sorted
    .map((r) => {
      const isDuplicate = (wordCounts.get(r.word) ?? 0) > 1;
      const badge = isDuplicate
        ? ' <span class="dup-badge" title="This term has more than one definition">⚠ dup</span>'
        : '';
      const wordCell = `<td class="${isDuplicate ? 'duplicate' : ''}">${escapeHtml(r.word)}${badge}</td>`;
      return `<tr data-id="${r.id}">${wordCell}${editableCell('text', r.text)}${authorCell(r.author)}${dateCell(r.created)}${copyIdButtonCell()}${deleteButtonCell()}</tr>`;
    })
    .join('');

  return `<table class="mtqg-table">
  <thead><tr><th>Word</th><th>Definition</th><th>Author</th><th>Date</th><th></th><th></th></tr></thead>
  <tbody>
    <tr class="add-row">${editableCell('word', '', 'New term')}${editableCell('text', '', 'New definition')}<td></td><td></td><td></td><td></td></tr>
    ${rows}
  </tbody>
</table>`;
}
