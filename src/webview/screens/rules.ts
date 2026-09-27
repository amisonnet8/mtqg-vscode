import type { RuleRecord } from '../../mtqg/types';
import { authorCell, copyIdButtonCell, dateCell, deleteButtonCell, editableCell } from './table';

/**
 * `rule list` does not guarantee any particular order (verified against the
 * real binary: three rules added in sequence came back as third/first/second
 * -- it appears to be ID order). The newest-first order decided for this
 * screen (q&a `e07736f680`) is therefore built here from `created`, not
 * inherited from mtqg's own response.
 */
export function renderRules(records: RuleRecord[]): string {
  const sorted = [...records].sort((a, b) => b.created.localeCompare(a.created));
  const rows = sorted
    .map(
      (r) =>
        `<tr data-id="${r.id}">${editableCell('text', r.text)}${authorCell(r.author)}${dateCell(r.created)}${copyIdButtonCell()}${deleteButtonCell()}</tr>`,
    )
    .join('');

  return `<table class="mtqg-table">
  <thead><tr><th>Text</th><th>Author</th><th>Date</th><th></th><th></th></tr></thead>
  <tbody>
    <tr class="add-row">${editableCell('text', '', 'New rule text')}<td></td><td></td><td></td><td></td></tr>
    ${rows}
  </tbody>
</table>`;
}
