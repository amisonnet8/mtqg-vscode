import * as path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { downloadAndUnzipVSCode, runTests } from '@vscode/test-electron';
import { createTempRepo, developerHomeEnv } from '../helpers/tempRepo';

const DOWNLOAD_ATTEMPTS = 3;

/**
 * Before any test runs, @vscode/test-electron asks
 * update.code.visualstudio.com which VS Code to use. On the CI runners that
 * request has timed out (macOS, Windows) and answered with an error page
 * instead of JSON (bug d35dc02c50); with no VS Code cached yet (ci.yml) the
 * whole run failed before a single test. Only this step is retried --
 * the same options runTests would pass to it, so the version chosen does
 * not change -- never the tests themselves, so a failing test is not
 * hidden by a retry.
 */
async function downloadVSCode(extensionDevelopmentPath: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      // The default 15 s ran out on the macOS and Windows CI runners.
      return await downloadAndUnzipVSCode({ extensionDevelopmentPath, timeout: 60_000 });
    } catch (err) {
      if (attempt >= DOWNLOAD_ATTEMPTS) {
        throw err;
      }
      console.warn(`Getting VS Code failed (attempt ${attempt} of ${DOWNLOAD_ATTEMPTS}); retrying`, err);
      await sleep(10_000 * attempt);
    }
  }
}

async function main(): Promise<void> {
  // out/test/vscode/runTest.js -> repository root is three levels up.
  const extensionDevelopmentPath = path.resolve(__dirname, '../../..');
  const extensionTestsPath = path.resolve(__dirname, './suite/index');

  let vscodeExecutablePath: string;
  try {
    vscodeExecutablePath = await downloadVSCode(extensionDevelopmentPath);
  } catch (err) {
    console.error('Failed to get VS Code', err);
    process.exit(1);
  }

  // A real workspace with `.mtqg/` initialized, opened as the VS Code
  // window's folder below. Without this, vscode.workspace.workspaceFolders
  // is empty and openPanel (src/webview/panel.ts) skips creating the
  // FileSystemWatcher/controller entirely -- the very code this suite
  // should be exercising (todo b9caf0b88c).
  const repo = await createTempRepo();

  try {
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      // --disable-gpu: this container has no real GPU, and leaving GPU
      // acceleration on (even with --disable-gpu-sandbox) has left the
      // downloaded VS Code hanging on shutdown after a Webview test
      // (bug, todo 97779f964e).
      // --disable-workspace-trust: a folder is now opened below, and the
      // trust prompt would otherwise block this headless run.
      launchArgs: [repo.root, '--disable-extensions', '--disable-gpu', '--disable-workspace-trust'],
      // tempRepo.ts points HOME at a throwaway directory for the whole test
      // process; VS Code itself hung on macOS with that HOME (bug
      // 7290a04665), so it gets the developer's own home back. The git
      // identity and the removal of MTQG_AUTHOR_* still apply to the mtqg it
      // runs.
      extensionTestsEnv: { ...developerHomeEnv },
    });
  } catch (err) {
    await repo.cleanup();
    console.error('Failed to run tests', err);
    process.exit(1);
  }
  await repo.cleanup();
}

main();
