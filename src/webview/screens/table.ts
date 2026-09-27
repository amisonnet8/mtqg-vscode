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

/**
 * A small text badge, never colour alone (ui.md「色だけで意味を伝えない」).
 * Used for the AI/human distinction on a QA answer (ui.md「AIが推測で書いた
 * 回答」「人間が確定させた回答」, todo `8b7b600827`) the same way Glossary's
 * `dup-badge` flags a duplicate word.
 */
export function badge(text: string, extraClass?: string): string {
  const cls = extraClass ? `badge ${extraClass}` : 'badge';
  return `<span class="${cls}">${escapeHtml(text)}</span>`;
}

/**
 * A timestamp element. The text shown here (UTC, `formatDate`) is only the
 * fallback until the Webview's fixed script (`client/main.ts`) runs and
 * replaces it with the viewer's own local time, read back out of `data-iso`
 * (bug `062ae1c25e`: the extension host's own timezone is not necessarily
 * the viewer's). Callers that need this inline (not already inside a `<td>`,
 * e.g. `thread.ts`'s reply meta line) use this directly instead of wrapping
 * plain text in `escapeHtml` -- this returns markup, not text.
 */
export function dateSpan(iso: string): string {
  return `<span class="date" data-iso="${escapeHtml(iso)}">${escapeHtml(formatDate(iso))}</span>`;
}

export function dateCell(iso: string): string {
  return `<td>${dateSpan(iso)}</td>`;
}

/** `mtqg delete` (q&a `e07736f680`: no confirmation dialog -- deletes are never truly lost). */
export function deleteButton(): string {
  return '<button type="button" data-action="delete" aria-label="Delete">✕</button>';
}

export function deleteButtonCell(): string {
  return `<td>${deleteButton()}</td>`;
}

/**
 * Copies the record's own id to the clipboard. Handled entirely in the
 * Webview's fixed script (`src/webview/client/main.ts`) via the id already
 * carried by the ancestor `[data-id]` element (same lookup `deleteButton`
 * relies on) -- this never calls mtqg, so unlike every other action here it
 * needs no `vscode.postMessage` round trip to the host (decision, q&a
 * `414d6889d172`). The clipboard emoji (rather than the originally-chosen
 * `⧉`, U+29C9) is a deliberate choice: real-device testing found `⧉` has no
 * glyph in this devcontainer's font (DejaVu) and rendered as tofu -- q&a
 * `414d6889d172`'s follow-up answer.
 */
export function copyIdButton(): string {
  return '<button type="button" class="copy-id" data-action="copy-id" aria-label="Copy ID" title="Copy ID">📋</button>';
}

export function copyIdButtonCell(): string {
  return `<td>${copyIdButton()}</td>`;
}
