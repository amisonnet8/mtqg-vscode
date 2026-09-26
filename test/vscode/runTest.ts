import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';
import { createTempRepo } from '../helpers/tempRepo';

async function main(): Promise<void> {
  // out/test/vscode/runTest.js -> repository root is three levels up.
  const extensionDevelopmentPath = path.resolve(__dirname, '../../..');
  const extensionTestsPath = path.resolve(__dirname, './suite/index');

  // A real workspace with `.mtqg/` initialized, opened as the VS Code
  // window's folder below. Without this, vscode.workspace.workspaceFolders
  // is empty and openPanel (src/webview/panel.ts) skips creating the
  // FileSystemWatcher/controller entirely -- the very code this suite
  // should be exercising (todo b9caf0b88c).
  const repo = await createTempRepo();

  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      // --disable-gpu: this container has no real GPU, and leaving GPU
      // acceleration on (even with --disable-gpu-sandbox) has left the
      // downloaded VS Code hanging on shutdown after a Webview test
      // (bug, todo 97779f964e).
      // --disable-workspace-trust: a folder is now opened below, and the
      // trust prompt would otherwise block this headless run.
      launchArgs: [repo.root, '--disable-extensions', '--disable-gpu', '--disable-workspace-trust'],
    });
  } catch (err) {
    await repo.cleanup();
    console.error('Failed to run tests', err);
    process.exit(1);
  }
  await repo.cleanup();
}

main();
