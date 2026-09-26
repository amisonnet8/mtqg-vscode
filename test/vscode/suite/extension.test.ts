import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as vscode from 'vscode';

const EXTENSION_ID = 'amisonnet8.mtqg';

test('the extension activates', async () => {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(extension, `extension ${EXTENSION_ID} not found`);
  await extension.activate();
  assert.equal(extension.isActive, true);
});

test('mtqg.open is registered', async () => {
  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes('mtqg.open'));
});

test('a workspace folder with .mtqg/ is open (runTest.ts opens a temp mtqg repo)', () => {
  assert.equal(vscode.workspace.workspaceFolders?.length, 1);
});

test('mtqg.open opens exactly one Webview tab, even when run twice', async () => {
  const tabCountBefore = countMtqgTabs();

  try {
    // With a workspace folder open, this also exercises the
    // FileSystemWatcher/controller wiring in src/webview/panel.ts (todo
    // b9caf0b88c) -- a throw there would fail this await.
    await vscode.commands.executeCommand('mtqg.open');
    // tabGroups.all reflects a newly opened tab only after a round trip to
    // the renderer, not synchronously when executeCommand resolves.
    await waitUntil(() => countMtqgTabs() === tabCountBefore + 1);

    await vscode.commands.executeCommand('mtqg.open');
    // The second call should only reveal the existing panel, so there is no
    // "tabs changed" event to wait for here; give it a short grace period
    // in case it wrongly opened a second tab, then check the count once.
    await delay(500);

    assert.equal(countMtqgTabs(), tabCountBefore + 1);
  } finally {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  }
});

function countMtqgTabs(): number {
  return vscode.window.tabGroups.all
    .flatMap((group) => group.tabs)
    .filter((tab) => tab.label === 'mtqg').length;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitUntil(condition: () => boolean, timeoutMs = 5_000): Promise<void> {
  if (condition()) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      disposable.dispose();
      reject(new Error(`condition not met within ${timeoutMs}ms`));
    }, timeoutMs);
    const disposable = vscode.window.tabGroups.onDidChangeTabs(() => {
      if (condition()) {
        clearTimeout(timeout);
        disposable.dispose();
        resolve();
      }
    });
  });
}
