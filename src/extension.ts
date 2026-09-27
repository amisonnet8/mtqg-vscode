import * as vscode from 'vscode';
import { openPanel } from './webview/panel';
import { registerCreateRecordAtCommand } from './commands/createRecordAt';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('mtqg.open', () => {
      openPanel(context.extensionUri);
    }),
  );
  registerCreateRecordAtCommand(context);
}

export function deactivate(): void {
  // Nothing to clean up: the panel disposes itself (src/webview/panel.ts).
}
