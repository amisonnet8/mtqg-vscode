import * as crypto from 'node:crypto';
import * as vscode from 'vscode';
import { checkMtqgAvailability, describeAvailabilityWarning } from '../mtqg/availability';
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
  // Same mtqg logo mark as the editor/title button (package.json's mtqg.open
  // icon) -- both point at the same two files. WebviewPanel.iconPath does
  // not accept a Codicon reference like "$(book)" (used here before mtqg
  // had its own logo), only a Uri (q&a `f16585cd161d`).
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
    // One-time check, only when actually creating the panel (todo
    // `239043c4c6`, bug `3fc28931b2`): a missing mtqg already surfaces per
    // screen (screens.ts's renderError, from the same MtqgNotFoundError
    // every render hits), but an old-but-present mtqg does not -- it just
    // fails confusingly on a screen that happens to use a newer flag (e.g.
    // Memo's `--events`). Not re-checked on reveal() of an already-open
    // panel, and not re-checked on every write failure -- both would just
    // spend an extra `mtqg version` call and repeat the same notification.
    void checkMtqgAvailability(folder.uri.fsPath).then((result) => {
      const warning = describeAvailabilityWarning(result);
      if (!warning) {
        return;
      }
      if (warning.severity === 'error') {
        void vscode.window.showErrorMessage(warning.message);
      } else {
        void vscode.window.showWarningMessage(warning.message);
      }
    });

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
