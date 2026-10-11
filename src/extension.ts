import * as vscode from 'vscode';
import { openPanel, registerPanelSerializer } from './webview/panel';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('mtqg.open', () => {
      openPanel(context);
    }),
    // Restores the panel when VS Code restarts with it open (todo `0822a2c167`).
    registerPanelSerializer(context),
  );
}

export function deactivate(): void {
  // Nothing to clean up: the panel disposes itself (src/webview/panel.ts).
}
