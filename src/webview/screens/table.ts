import type { Author } from '../../mtqg/types';
import { escapeHtml } from '../shared/escape';
import { formatDate } from './format';

/**
 * A cell whose text can be edited in place (ui.md「インライン編集」,
 * q&a `e07736f680`). `data-original` lets the Webview's fixed script
 * (src/webview/client/main.ts) tell "unchanged" and "cleared" apart on
 * blur without asking the host. Used both for an existing record's cell
 * (with an id-bearing `<tr>`) and for the always-present, id-less "add"
 * row (todo daf43fc83d design: 新規追加も表の空白行に直接入力する).
 */
export function editableCell(field: string, value: string, ariaLabel?: string): string {
  const escaped = escapeHtml(value);
  const label = ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : '';
  return `<td class="editable" contenteditable="true" data-field="${field}" data-original="${escaped}"${label}>${escaped}</td>`;
}

export function plainCell(value: string): string {
  return `<td>${escapeHtml(value)}</td>`;
}

export function authorCell(author: Author): string {
  return plainCell(`${author.name} (${author.kind})`);
}

export function dateCell(iso: string): string {
  return plainCell(formatDate(iso));
}

/** `mtqg delete` (q&a `e07736f680`: no confirmation dialog -- deletes are never truly lost). */
export function deleteButtonCell(): string {
  return '<td><button type="button" data-action="delete" aria-label="Delete">✕</button></td>';
}
