import * as crypto from 'node:crypto';
import * as vscode from 'vscode';
import { createMtqgClient } from '../mtqg/client';
import { createPanelController, type PanelController } from './controller';
import { renderShell } from './shared/html';
import type { HostMessage } from './shared/messages';

let currentPanel: vscode.WebviewPanel | undefined;
let currentController: PanelController | undefined;
let currentWatcher: vscode.FileSystemWatcher | undefined;

/** Opens the mtqg panel, or reveals it if it is already open. */
export function openPanel(extensionUri: vscode.Uri): void {
  if (currentPanel) {
    currentPanel.reveal();
    return;
  }

  const scriptDir = vscode.Uri.joinPath(extensionUri, 'out', 'webview');
  const panel = vscode.window.createWebviewPanel('mtqg', 'mtqg', vscode.ViewColumn.Active, {
    enableScripts: true,
    localResourceRoots: [scriptDir],
  });
  // Same book glyph as the editor/title button (package.json's mtqg.open
  // icon), but as actual files -- WebviewPanel.iconPath does not accept a
  // Codicon reference like "$(book)", only a Uri (q&a `f16585cd161d`).
  panel.iconPath = {
    light: vscode.Uri.joinPath(extensionUri, 'media', 'tab-icon-light.svg'),
    dark: vscode.Uri.joinPath(extensionUri, 'media', 'tab-icon-dark.svg'),
  };

  const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(scriptDir, 'main.js'));
  panel.webview.html = renderShell({
    cspSource: panel.webview.cspSource,
    nonce: crypto.randomBytes(16).toString('base64'),
    scriptUri: scriptUri.toString(),
  });

  const folder = vscode.workspace.workspaceFolders?.[0];
  if (folder) {
    const client = createMtqgClient(folder.uri.fsPath);
    const controller = createPanelController({
      client,
      post: (message: HostMessage) => {
        void panel.webview.postMessage(message);
      },
    });
    currentController = controller;

    panel.webview.onDidReceiveMessage((message: unknown) => controller.handleMessage(message));

    // .mtqg/journal.jsonl's contents are never read here -- mtqg is always
    // re-run for the current data (.claude/rules/mtqg-cli.md).
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(folder, '.mtqg/journal.jsonl'),
    );
    watcher.onDidChange(() => controller.journalChanged());
    watcher.onDidCreate(() => controller.journalChanged());
    watcher.onDidDelete(() => controller.journalChanged());
    currentWatcher = watcher;
  }

  panel.onDidDispose(() => {
    currentPanel = undefined;
    currentController?.dispose();
    currentController = undefined;
    currentWatcher?.dispose();
    currentWatcher = undefined;
  });

  currentPanel = panel;
}
