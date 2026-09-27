import * as vscode from 'vscode';
import { computeAt } from './at';
import { createMtqgClient } from '../mtqg/client';
import { parseComposer, type ComposerPost } from '../webview/screens/composer';
import { openPanel } from '../webview/panel';

/** naming.md's term table, but for the noun of the record just created
 * (matches `qa`->"question", `glossary`->"term" the same way `memos.ts`'s
 * labels do). */
const KIND_NOUNS: Record<ComposerPost['kind'], string> = {
  memo: 'memo',
  todo: 'todo',
  qa: 'question',
  bug: 'bug',
  rule: 'rule',
  glossary: 'term',
};

/**
 * Registers `mtqg.createAt` (todo `24f2e871d5`): create a record whose `at`
 * points at the editor's current selection/cursor position, without going
 * through the Webview. Reuses `screens/composer.ts`'s `parseComposer` so the
 * input box takes exactly the same `/todo`/`/qa`/`/bug`/`/rule`/`/glossary`
 * syntax (and one-letter aliases) as the Memo screen's composer (q&a
 * `3c51406bbe5a`) -- a plain memo needs no slash at all.
 *
 * This is the second (and only other) place besides `src/webview/panel.ts`
 * that touches `vscode` directly (`.claude/rules/directory-structure.md`).
 * The position math itself lives in the vscode-independent `./at.ts` so it
 * can be tested with `node:test` without a real editor.
 */
export function registerCreateRecordAtCommand(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('mtqg.createAt', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('mtqg: open a file to create a record at its location.');
        return;
      }
      if (editor.document.uri.scheme !== 'file') {
        vscode.window.showErrorMessage('mtqg: save the file before creating a record here.');
        return;
      }
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) {
        vscode.window.showErrorMessage('mtqg: open a folder to create a record.');
        return;
      }

      const at = computeAt(folder.uri.fsPath, editor.document.uri.fsPath, {
        startLine: editor.selection.start.line,
        endLine: editor.selection.end.line,
      });
      const location = `${at.path}:${at.line}`;

      const input = await vscode.window.showInputBox({
        prompt: `Add a record at ${location}`,
        placeHolder: 'Write a memo… (/todo /qa /bug /rule /glossary)',
      });
      if (input === undefined) return; // cancelled (Escape)

      const parsed = parseComposer(input);
      if ('error' in parsed) {
        vscode.window.showErrorMessage(parsed.error);
        return;
      }

      const client = createMtqgClient(folder.uri.fsPath);
      try {
        switch (parsed.kind) {
          case 'memo':
            await client.memoAdd(parsed.text, at);
            break;
          case 'todo':
            await client.todoAdd(parsed.text, at);
            break;
          case 'qa':
            await client.qaAsk(parsed.text, at);
            break;
          case 'bug':
            await client.bugReport(parsed.text, at);
            break;
          case 'rule':
            await client.ruleAdd(parsed.text, at);
            break;
          case 'glossary':
            await client.glossaryAdd(parsed.word, parsed.text, at);
            break;
        }
      } catch (err) {
        vscode.window.showErrorMessage(err instanceof Error ? err.message : String(err));
        return;
      }

      const choice = await vscode.window.showInformationMessage(
        `Added a ${KIND_NOUNS[parsed.kind]} at ${location}`,
        'View',
      );
      if (choice === 'View') openPanel(context.extensionUri);
    }),
  );
}
