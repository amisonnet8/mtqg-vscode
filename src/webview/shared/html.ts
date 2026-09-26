/**
 * Pure HTML-string builders for the Webview. Kept free of the `vscode` module
 * so they can be unit-tested without an extension host
 * (.claude/rules/testing.md "UIの見た目").
 */

export interface ShellOptions {
  /** The Webview's own CSP source (`webview.cspSource`). */
  cspSource: string;
  /** A per-render nonce, used to allow-list this render's own script/style tags. */
  nonce: string;
}

/**
 * Renders the outer shell of the mtqg panel: a strict CSP and a placeholder
 * body. The six screens (ToDo/QA/Bugs/Rules/Glossary/Memo) are built on top
 * of this in a later step (todo b9caf0b88c).
 */
export function renderShell(options: ShellOptions): string {
  const { cspSource, nonce } = options;
  const csp = [
    "default-src 'none'",
    `style-src ${cspSource} 'nonce-${nonce}'`,
    `script-src 'nonce-${nonce}'`,
  ].join('; ');

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
    }
  </style>
</head>
<body>
  <h1>mtqg</h1>
</body>
</html>
`;
}
