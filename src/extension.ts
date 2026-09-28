import * as vscode from 'vscode';
import { openPanel } from './webview/panel';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('mtqg.open', () => {
      openPanel(context.extensionUri);
    }),
  );
}

export function deactivate(): void {
  // Nothing to clean up: the panel disposes itself (src/webview/panel.ts).
}
