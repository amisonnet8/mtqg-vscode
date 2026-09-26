import type { Author } from '../../mtqg/types';
import { escapeHtml } from '../shared/escape';
import { formatDate } from './format';

/**
 * An element whose text can be edited in place (ui.md「インライン編集」,
 * q&a `e07736f680`). `data-original` lets the Webview's fixed script
 * (src/webview/client/main.ts) tell "unchanged" and "cleared" apart on
 * blur without asking the host. Used both for an existing record's element
 * (with an id-bearing ancestor) and for the always-present, id-less "add"
 * row (todo daf43fc83d design: 新規追加も表の空白行に直接入力する).
 *
 * `tag` lets table cells (`<td>`, Rules/Glossary) and card fields (`<div>`,
 * ToDo, todo `4e09f42a9f`) share the same editing behaviour without either
 * screen being forced into the other's element.
 */
export function editableElement(tag: string, field: string, value: string, ariaLabel?: string): string {
  const escaped = escapeHtml(value);
  const label = ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : '';
  return `<${tag} class="editable" contenteditable="true" data-field="${field}" data-original="${escaped}"${label}>${escaped}</${tag}>`;
}

export function editableCell(field: string, value: string, ariaLabel?: string): string {
  return editableElement('td', field, value, ariaLabel);
}

export function plainCell(value: string): string {
  return `<td>${escapeHtml(value)}</td>`;
}

export function authorText(author: Author): string {
  return `${author.name} (${author.kind})`;
}

export function authorCell(author: Author): string {
  return plainCell(authorText(author));
}

export function dateText(iso: string): string {
  return formatDate(iso);
}

export function dateCell(iso: string): string {
  return plainCell(dateText(iso));
}

/** `mtqg delete` (q&a `e07736f680`: no confirmation dialog -- deletes are never truly lost). */
export function deleteButton(): string {
  return '<button type="button" data-action="delete" aria-label="Delete">✕</button>';
}

export function deleteButtonCell(): string {
  return `<td>${deleteButton()}</td>`;
}
