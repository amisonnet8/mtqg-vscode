/**
 * Pure HTML-string builders for the Webview. Kept free of the `vscode`
 * module so they can be unit-tested without an extension host
 * (.claude/rules/testing.md "UIの見た目"). HTML is assembled here, on the
 * host, rather than by DOM code inside the Webview (q&a `0736e37fd7`): the
 * Webview only holds the one small fixed script referenced below
 * (src/webview/client/main.ts), which swaps a tabpanel's `innerHTML` for
 * whatever this layer produced.
 */
import { TAB_IDS, TAB_LABELS, DEFAULT_TAB } from './tabs';

export interface ShellOptions {
  /** The Webview's own CSP source (`webview.cspSource`). */
  cspSource: string;
  /** A per-render nonce, used to allow-list this render's own script/style tags. */
  nonce: string;
  /** `webview.asWebviewUri(...)` for the compiled client script. */
  scriptUri: string;
}

/**
 * Renders the outer shell of the mtqg panel: a strict CSP, the tab bar for
 * the six screens (ui.md), and one empty tabpanel per screen. A panel's
 * content arrives later via a `render` message (src/webview/controller.ts)
 * -- this function never calls mtqg itself.
 */
export function renderShell(options: ShellOptions): string {
  const { cspSource, nonce, scriptUri } = options;
  const csp = [
    "default-src 'none'",
    `style-src ${cspSource} 'nonce-${nonce}'`,
    `script-src 'nonce-${nonce}'`,
  ].join('; ');

  const tabs = TAB_IDS.map(
    (id) =>
      `<button role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${id === DEFAULT_TAB}" data-tab="${id}">${TAB_LABELS[id]}</button>`,
  ).join('\n    ');

  const panels = TAB_IDS.map(
    (id) =>
      `<section role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}" data-tab="${id}"${
        id === DEFAULT_TAB ? '' : ' hidden'
      }></section>`,
  ).join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>mtqg</title>
  <style nonce="${nonce}">
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      margin: 0;
    }
    [role="tablist"] {
      display: flex;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    [role="tab"] {
      font-family: inherit;
      color: var(--vscode-foreground);
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 8px 12px;
      cursor: pointer;
    }
    [role="tab"]:hover {
      background-color: var(--vscode-list-hoverBackground);
    }
    [role="tab"]:focus-visible {
      outline: 1px solid var(--vscode-focusBorder);
    }
    [role="tab"][aria-selected="true"] {
      font-weight: bold;
      border-bottom-color: var(--vscode-focusBorder);
    }
    [role="tabpanel"] {
      padding: 12px;
    }
    .error {
      color: var(--vscode-errorForeground);
    }
    .mtqg-table {
      width: 100%;
      border-collapse: collapse;
    }
    .mtqg-table th {
      text-align: left;
      border-bottom: 1px solid var(--vscode-panel-border);
      padding: 4px 8px;
    }
    .mtqg-table td {
      border-bottom: 1px solid var(--vscode-panel-border);
      padding: 4px 8px;
      vertical-align: top;
    }
    .mtqg-table .add-row {
      color: var(--vscode-descriptionForeground);
    }
    .editable {
      cursor: text;
    }
    .editable:empty::before {
      content: attr(aria-label);
      opacity: 0.6;
    }
    .editable:focus {
      outline: 1px solid var(--vscode-focusBorder);
      color: var(--vscode-foreground);
    }
    .mtqg-table tr[data-id] td.duplicate {
      background-color: var(--vscode-inputValidation-warningBackground);
    }
    .mtqg-table .dup-badge {
      font-size: 0.85em;
      opacity: 0.85;
    }
    button[data-action="delete"] {
      font-family: inherit;
      color: inherit;
      background: none;
      border: none;
      cursor: pointer;
      opacity: 0.6;
    }
    button[data-action="delete"]:hover {
      opacity: 1;
    }
    .screen-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    .screen-toolbar .add-row {
      flex: 1;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 6px 10px;
    }
    .screen-toolbar label {
      white-space: nowrap;
    }
    .done-heading {
      color: var(--vscode-descriptionForeground);
      font-size: 0.9em;
      font-weight: normal;
      margin: 16px 0 8px;
    }
    .mtqg-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 8px;
    }
    .card {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      position: relative;
    }
    .card .editable {
      min-height: 1.2em;
      padding-right: 22px;
    }
    .card.done .editable {
      text-decoration: line-through;
      color: var(--vscode-descriptionForeground);
    }
    .card-check {
      position: absolute;
      top: 8px;
      right: 8px;
    }
    .card-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
    }
    .card button[data-action="delete"] {
      align-self: flex-end;
    }
    .toggle-expand {
      font-family: inherit;
      font-size: inherit;
      color: var(--vscode-textLink-foreground);
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 6px;
      white-space: nowrap;
    }
    .toggle-expand:hover {
      text-decoration: underline;
    }
    .mtqg-table tr.section-heading td {
      color: var(--vscode-descriptionForeground);
      font-size: 0.9em;
      border-bottom: none;
      padding-top: 16px;
    }
    .thread-detail td {
      background-color: var(--vscode-textCodeBlock-background);
    }
    .thread-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 6px;
    }
    .thread-reply {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .thread-reply .editable {
      flex: 1;
    }
    .thread-reply-meta {
      font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
      white-space: nowrap;
    }
    .badge {
      font-size: 0.75em;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 3px;
      padding: 0 4px;
      white-space: nowrap;
    }
    .badge-ai {
      border-color: var(--vscode-charts-purple, var(--vscode-panel-border));
    }
    .badge-human {
      border-color: var(--vscode-charts-green, var(--vscode-panel-border));
    }
  </style>
</head>
<body>
  <div role="tablist" aria-label="mtqg">
    ${tabs}
  </div>
  ${panels}
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>
`;
}
