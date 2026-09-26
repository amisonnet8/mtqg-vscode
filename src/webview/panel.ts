import * as crypto from 'node:crypto';
import * as vscode from 'vscode';
import { renderShell } from './shared/html';

let currentPanel: vscode.WebviewPanel | undefined;

/** Opens the mtqg panel, or reveals it if it is already open. */
export function openPanel(extensionUri: vscode.Uri): void {
  if (currentPanel) {
    currentPanel.reveal();
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'mtqg',
    'mtqg',
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      localResourceRoots: [extensionUri],
    },
  );

  panel.webview.html = renderShell({
    cspSource: panel.webview.cspSource,
    nonce: crypto.randomBytes(16).toString('base64'),
  });

  panel.onDidDispose(() => {
    currentPanel = undefined;
  });

  currentPanel = panel;
}
