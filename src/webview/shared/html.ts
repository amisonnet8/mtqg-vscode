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
