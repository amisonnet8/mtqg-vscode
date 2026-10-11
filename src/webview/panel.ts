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

const TTY_STATE_KEY = 'mtqg.tty';

/**
 * The `MTQG_TTY` value this workspace's mtqg calls carry (todo
 * `fa41e547fd`): random, created on first use and kept in `workspaceState`,
 * so the extension's own lines stay one "terminal" across VS Code restarts
 * (its Undo can still revert what it wrote before the restart) while an AI
 * agent's tty-less lines never share it.
 */
function workspaceTty(context: vscode.ExtensionContext): string {
  const saved = context.workspaceState.get<string>(TTY_STATE_KEY);
  if (saved) {
    return saved;
  }
  const created = crypto.randomUUID();
  void context.workspaceState.update(TTY_STATE_KEY, created);
  return created;
}

/** The `viewType` of the panel, and of the serializer that restores it
 * (package.json's `onWebviewPanel:mtqg` activation event must match). */
const PANEL_VIEW_TYPE = 'mtqg';

function webviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
  return {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out', 'webview')],
  };
}

/** Opens the mtqg panel, or reveals it if it is already open. */
export function openPanel(context: vscode.ExtensionContext): void {
  if (currentPanel) {
    currentPanel.reveal();
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    PANEL_VIEW_TYPE,
    'mtqg',
    vscode.ViewColumn.Active,
    webviewOptions(context.extensionUri),
  );
  setupPanel(context, panel);
}

/**
 * Brings the panel back after VS Code restarts (todo `0822a2c167`): without
 * a serializer, a Webview tab that was open when the window closed is simply
 * dropped. VS Code hands back an empty panel of this `viewType` -- its html
 * and options are not persisted -- so it goes through the same
 * `setupPanel` as a freshly opened one. Which screen was selected comes back
 * by itself: src/webview/client/main.ts keeps it in the Webview's own
 * `setState`, which VS Code restores for a serialized panel.
 */
export function registerPanelSerializer(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.window.registerWebviewPanelSerializer(PANEL_VIEW_TYPE, {
    deserializeWebviewPanel(panel: vscode.WebviewPanel): Promise<void> {
      if (currentPanel) {
        // `mtqg: Open` ran before the restore got to this tab: one panel at a
        // time (the module-level state below is single-instance).
        panel.dispose();
        return Promise.resolve();
      }
      panel.webview.options = webviewOptions(context.extensionUri);
      setupPanel(context, panel);
      return Promise.resolve();
    },
  });
}

/** Everything a panel needs, whether it was just created or restored. */
function setupPanel(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): void {
  const extensionUri = context.extensionUri;
  const scriptDir = vscode.Uri.joinPath(extensionUri, 'out', 'webview');
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

    const client = createMtqgClient(folder.uri.fsPath, 'mtqg', { tty: workspaceTty(context) });
    const controller = createPanelController({
      client,
      post: (message: HostMessage) => {
        void panel.webview.postMessage(message);
      },
    });
    currentController = controller;

    panel.webview.onDidReceiveMessage((message: unknown) => controller.handleMessage(message));

    // One-time file list for the `@`-mention typeahead (src/webview/client/main.ts):
    // not live-watched, a known limitation left for a future todo if it matters.
    void vscode.workspace
      .findFiles(new vscode.RelativePattern(folder, '**/*'), '**/{node_modules,.git}/**', 5000)
      .then((uris) => {
        const paths = uris.map((uri) => vscode.workspace.asRelativePath(uri, false));
        void panel.webview.postMessage({ type: 'files', paths } satisfies HostMessage);
      });

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
